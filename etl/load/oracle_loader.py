"""집계·표준화 결과를 Oracle 시장 데이터 6테이블에 멱등 적재.

대상(db/schema.sql §7~9):
    MARKET_JOB_POSTINGS / MARKET_JOB_STACKS          표준화 공고 + 스택(원천)
    ANALYTICS_MONTHLY_JOBS                            월별 공고 수
    ANALYTICS_STACK_TRENDS / ANALYTICS_REGION_JOBS    BE 가 읽는 대시보드 집계
    ETL_RUNS                                          실행 이력(최신 base_date 노출용)

멱등성 전략:
    - 표준화 공고: (source, external_id) UNIQUE 기준 MERGE(월 경계를 넘어 누적).
    - 공고 스택: 해당 공고 id 의 기존 행 DELETE 후 INSERT(스택 변동 반영).
    - 분석 3종: 이번 base_month 의 'ALL' 스코프 행을 DELETE 후 INSERT
      (집계에서 빠진 stale 스택/지역 행이 남지 않도록).

센티넬 규약은 schema.sql / BE 엔티티와 동일하게 'ALL' 을 쓴다.
"""
from datetime import date, datetime

import oracledb

from common.exceptions import LoadError
from common.logger import get_logger
from config import settings

log = get_logger("load.oracle_loader")

SOURCE = "saramin"


def connect() -> oracledb.Connection:
    user, password, dsn = settings.require_oracle()
    try:
        return oracledb.connect(user=user, password=password, dsn=dsn)
    except oracledb.Error as e:  # pragma: no cover - 환경 의존
        raise LoadError(f"Oracle 접속 실패(dsn={dsn}): {e}") from e


def _to_date(s: str | None) -> date | None:
    """'YYYY-MM-DD' → date. 빈 값/파싱 실패 → None."""
    if not s:
        return None
    try:
        return date.fromisoformat(str(s)[:10])
    except ValueError:
        return None


# ──────────────────────────────────────────────────────────────────────────
# ETL_RUNS — 실행 이력
# ──────────────────────────────────────────────────────────────────────────
def start_run(conn: oracledb.Connection, base_date: date) -> int:
    """RUNNING 상태로 실행 이력 1행 삽입하고 run_id 반환(즉시 커밋)."""
    with conn.cursor() as cur:
        rid = cur.var(int)
        cur.execute(
            """
            INSERT INTO ETL_RUNS (id, source, started_at, status, base_date)
            VALUES (SEQ_ETL_RUNS.NEXTVAL, :source, SYSTIMESTAMP, 'RUNNING', :base_date)
            RETURNING id INTO :rid
            """,
            source=SOURCE, base_date=base_date, rid=rid,
        )
        conn.commit()
        return int(rid.getvalue()[0])


def finish_run(conn: oracledb.Connection, run_id: int, status: str,
               extracted: int | None = None, loaded: int | None = None,
               error: str | None = None) -> None:
    """실행 이력 종료(SUCCESS/FAILED) 갱신(즉시 커밋)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE ETL_RUNS
               SET ended_at = SYSTIMESTAMP, status = :status,
                   extracted_count = :extracted, loaded_count = :loaded,
                   error_message = :error
             WHERE id = :rid
            """,
            status=status, extracted=extracted, loaded=loaded,
            error=(error[:2000] if error else None), rid=run_id,
        )
        conn.commit()


# ──────────────────────────────────────────────────────────────────────────
# MARKET_JOB_POSTINGS / MARKET_JOB_STACKS
# ──────────────────────────────────────────────────────────────────────────
_MERGE_POSTING = """
MERGE INTO MARKET_JOB_POSTINGS t
USING (SELECT :source AS source, :external_id AS external_id FROM dual) s
   ON (t.source = s.source AND t.external_id = s.external_id)
WHEN MATCHED THEN UPDATE SET
   company_name = :company_name, title = :title, url = :url,
   position = :position, region = :region, sigungu = :sigungu,
   posted_date = :posted_date, deadline = :deadline,
   collected_at = :collected_at, base_date = :base_date,
   updated_at = SYSTIMESTAMP
WHEN NOT MATCHED THEN INSERT
   (id, source, external_id, company_name, title, url, position, region,
    sigungu, posted_date, deadline, collected_at, base_date)
   VALUES
   (SEQ_MARKET_JOBS.NEXTVAL, :source, :external_id, :company_name, :title, :url,
    :position, :region, :sigungu, :posted_date, :deadline, :collected_at, :base_date)
"""


def _posting_binds(rows: list[dict], base_date: date) -> list[dict]:
    binds = []
    for r in rows:
        ext = str(r.get("rec_idx") or "").strip()
        if not ext:
            ext = "url:" + str(r.get("url") or f'{r.get("company")}|{r.get("title")}')
        collected = _to_date(r.get("collected_date")) or base_date
        binds.append({
            "source": SOURCE,
            "external_id": ext[:100],
            "company_name": (str(r.get("company") or "")[:200] or None),
            "title": str(r.get("title") or "")[:300],
            "url": (str(r.get("url") or "")[:1000] or None),
            "position": (str(r.get("position") or "")[:50] or None),
            "region": (str(r.get("region") or "")[:50] or None),
            "sigungu": (str(r.get("sigungu") or "")[:50] or None),
            "posted_date": _to_date(r.get("posted_date")),
            "deadline": _to_date(r.get("deadline_date")),
            "collected_at": collected,
            "base_date": base_date,
        })
    return binds


def upsert_market_postings(conn: oracledb.Connection, rows: list[dict],
                           base_date: date) -> dict[str, int]:
    """표준화 공고 MERGE 후 {external_id: id} 매핑 반환(스택 적재용)."""
    binds = _posting_binds(rows, base_date)
    if not binds:
        return {}
    with conn.cursor() as cur:
        cur.executemany(_MERGE_POSTING, binds)
        # 이번 회차 base_date 로 갱신된 행 = 현재 배치. id 매핑 확보.
        cur.execute(
            "SELECT external_id, id FROM MARKET_JOB_POSTINGS "
            "WHERE source = :source AND base_date = :base_date",
            source=SOURCE, base_date=base_date,
        )
        return {ext: int(i) for ext, i in cur.fetchall()}


def upsert_market_stacks(conn: oracledb.Connection, rows: list[dict],
                         id_map: dict[str, int]) -> None:
    """공고별 스택을 DELETE 후 INSERT(스택 변동 반영, 멱등)."""
    del_ids, ins = [], []
    for r in rows:
        ext = str(r.get("rec_idx") or "").strip()
        if not ext:
            ext = "url:" + str(r.get("url") or f'{r.get("company")}|{r.get("title")}')
        mid = id_map.get(ext[:100])
        if mid is None:
            continue
        del_ids.append({"mid": mid})
        stacks = str(r.get("stacks") or "").split("|")
        kws = str(r.get("stack_keywords") or "").split("|")
        for i, stack in enumerate(stacks):
            stack = stack.strip()
            if not stack:
                continue
            kw = kws[i].strip() if i < len(kws) else ""
            ins.append({"mid": mid, "stack": stack[:50], "kw": (kw[:100] or None)})
    if not del_ids:
        return
    with conn.cursor() as cur:
        cur.executemany(
            "DELETE FROM MARKET_JOB_STACKS WHERE market_job_id = :mid", del_ids)
        if ins:
            cur.executemany(
                "INSERT INTO MARKET_JOB_STACKS "
                "(id, market_job_id, stack_name, matched_keyword) "
                "VALUES (SEQ_MARKET_STACKS.NEXTVAL, :mid, :stack, :kw)", ins)


# ──────────────────────────────────────────────────────────────────────────
# ANALYTICS_* — 이번 base_month 의 'ALL' 스코프를 통째로 교체
# ──────────────────────────────────────────────────────────────────────────
def upsert_monthly(conn: oracledb.Connection, base_month: str, count: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM ANALYTICS_MONTHLY_JOBS "
            "WHERE base_month = :m AND position = 'ALL' AND region = 'ALL'",
            m=base_month)
        cur.execute(
            "INSERT INTO ANALYTICS_MONTHLY_JOBS "
            "(id, base_month, position, region, posting_count) "
            "VALUES (SEQ_ANALYTICS_MONTHLY.NEXTVAL, :m, 'ALL', 'ALL', :cnt)",
            m=base_month, cnt=count)


def upsert_stack_trends(conn: oracledb.Connection, base_month: str,
                        trends: list[dict]) -> None:
    """집계 결과(stack_trends 전체) → ANALYTICS_STACK_TRENDS(ALL/ALL)."""
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM ANALYTICS_STACK_TRENDS "
            "WHERE base_month = :m AND position = 'ALL' AND region = 'ALL'",
            m=base_month)
        binds = [{
            "m": base_month,
            "stack": str(t["stack"])[:50],
            "cnt": int(t["postingCount"]),
            "ratio": float(t.get("ratio") or 0.0),
        } for t in trends]
        if binds:
            cur.executemany(
                "INSERT INTO ANALYTICS_STACK_TRENDS "
                "(id, base_month, position, region, stack_name, posting_count, ratio) "
                "VALUES (SEQ_ANALYTICS_STACK.NEXTVAL, :m, 'ALL', 'ALL', :stack, :cnt, :ratio)",
                binds)


def upsert_region_jobs(conn: oracledb.Connection, base_month: str,
                       regions: list[dict]) -> None:
    """지역 분포 → ANALYTICS_REGION_JOBS(position='ALL', sigungu='ALL')."""
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM ANALYTICS_REGION_JOBS "
            "WHERE base_month = :m AND position = 'ALL' AND sigungu = 'ALL'",
            m=base_month)
        binds = [{
            "m": base_month,
            "region": str(r["region"])[:50],
            "cnt": int(r["postingCount"]),
        } for r in regions]
        if binds:
            cur.executemany(
                "INSERT INTO ANALYTICS_REGION_JOBS "
                "(id, base_month, position, region, sigungu, posting_count) "
                "VALUES (SEQ_ANALYTICS_REGION.NEXTVAL, :m, 'ALL', :region, 'ALL', :cnt)",
                binds)


# ──────────────────────────────────────────────────────────────────────────
# 오케스트레이션
# ──────────────────────────────────────────────────────────────────────────
def load_market_data(conn: oracledb.Connection, rows: list[dict],
                     base_date: date, base_month: str,
                     trends: list[dict], regions: list[dict],
                     monthly_count: int) -> int:
    """6테이블 중 시장/분석 5종을 한 트랜잭션으로 적재(ETL_RUNS 제외).

    반환: 적재한 표준화 공고 수(loaded_count 용).
    """
    try:
        id_map = upsert_market_postings(conn, rows, base_date)
        upsert_market_stacks(conn, rows, id_map)
        upsert_monthly(conn, base_month, monthly_count)
        upsert_stack_trends(conn, base_month, trends)
        upsert_region_jobs(conn, base_month, regions)
        conn.commit()
        log.info("Oracle 적재 완료: 공고 %d, 스택트렌드 %d, 지역 %d",
                 len(id_map), len(trends), len(regions))
        return len(id_map)
    except oracledb.Error as e:
        conn.rollback()
        raise LoadError(f"Oracle 적재 실패: {e}") from e
