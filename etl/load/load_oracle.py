"""집계·표준화 결과를 Oracle에 멱등 적재(MERGE). 하나의 트랜잭션, 실패 시 롤백. 4일차."""
import math
import sys
from datetime import date, datetime

import numpy as np
import pandas as pd

from etl.common.oracle_client import get_connection
from etl.common.logger import get_logger
from etl.common.exceptions import LoadError
from etl.aggregate import build_analytics

log = get_logger("load_oracle")

# (source, external_id) 멱등 키로 표준 공고 MERGE
SQL_POSTING = """
MERGE INTO market_job_postings t
USING (SELECT :source AS source, :external_id AS external_id FROM dual) s
ON (t.source = s.source AND t.external_id = s.external_id)
WHEN MATCHED THEN UPDATE SET
    company_name=:company_name, title=:title, url=:url, position=:position,
    region=:region, sigungu=:sigungu, posted_date=:posted_date, deadline=:deadline,
    collected_at=:collected_at, base_date=:base_date, updated_at=SYSTIMESTAMP
WHEN NOT MATCHED THEN INSERT
    (id, source, external_id, company_name, title, url, position, region, sigungu,
     posted_date, deadline, collected_at, base_date)
VALUES (SEQ_MARKET_JOBS.NEXTVAL, :source, :external_id, :company_name, :title, :url,
     :position, :region, :sigungu, :posted_date, :deadline, :collected_at, :base_date)
"""

# (market_job_id, stack_name) 멱등 키로 공고×스택 MERGE
SQL_STACK = """
MERGE INTO market_job_stacks t
USING (SELECT :market_job_id AS market_job_id, :stack_name AS stack_name FROM dual) s
ON (t.market_job_id = s.market_job_id AND t.stack_name = s.stack_name)
WHEN MATCHED THEN UPDATE SET matched_keyword=:matched_keyword
WHEN NOT MATCHED THEN INSERT (id, market_job_id, stack_name, matched_keyword)
VALUES (SEQ_MARKET_STACKS.NEXTVAL, :market_job_id, :stack_name, :matched_keyword)
"""

SQL_MONTHLY = """
MERGE INTO analytics_monthly_jobs t
USING (SELECT :base_month AS base_month, :position AS position,
              :region AS region FROM dual) s
ON (t.base_month=s.base_month AND t.position=s.position AND t.region=s.region)
WHEN MATCHED THEN UPDATE SET posting_count=:posting_count, updated_at=SYSTIMESTAMP
WHEN NOT MATCHED THEN INSERT (id, base_month, position, region, posting_count)
VALUES (SEQ_ANALYTICS_MONTHLY.NEXTVAL, :base_month, :position, :region, :posting_count)
"""

SQL_REGION = """
MERGE INTO analytics_region_jobs t
USING (SELECT :base_month AS base_month, :position AS position,
              :region AS region FROM dual) s
ON (t.base_month=s.base_month AND t.position=s.position AND t.region=s.region)
WHEN MATCHED THEN UPDATE SET posting_count=:posting_count
WHEN NOT MATCHED THEN INSERT (id, base_month, position, region, posting_count)
VALUES (SEQ_ANALYTICS_REGION.NEXTVAL, :base_month, :position, :region, :posting_count)
"""

SQL_TREND = """
MERGE INTO analytics_stack_trends t
USING (SELECT :base_month AS base_month, :position AS position, :region AS region,
              :stack_name AS stack_name FROM dual) s
ON (t.base_month=s.base_month AND t.position=s.position AND t.region=s.region
    AND t.stack_name=s.stack_name)
WHEN MATCHED THEN UPDATE SET posting_count=:posting_count, ratio=:ratio
WHEN NOT MATCHED THEN INSERT (id, base_month, position, region, stack_name, posting_count, ratio)
VALUES (SEQ_ANALYTICS_STACK.NEXTVAL, :base_month, :position, :region, :stack_name,
        :posting_count, :ratio)
"""


def _date(s):
    """'YYYY-MM-DD'(앞 10자) → date. 결측/파싱불가는 None."""
    if not s or (isinstance(s, float) and math.isnan(s)):
        return None
    try:
        return datetime.strptime(str(s)[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def _records(df: pd.DataFrame) -> list:
    """DataFrame → executemany용 dict 리스트. NaN/NA→None, numpy 스칼라→파이썬 기본형."""
    rows = []
    for rec in df.to_dict("records"):
        clean = {}
        for k, v in rec.items():
            if v is None or v is pd.NA or (isinstance(v, float) and math.isnan(v)):
                clean[k] = None
            elif isinstance(v, np.integer):
                clean[k] = int(v)
            elif isinstance(v, np.floating):
                clean[k] = float(v)
            else:
                clean[k] = v
        rows.append(clean)
    return rows


def _posting_rows(postings: pd.DataFrame, collected_at: datetime) -> list:
    """표준 공고 → market_job_postings 바인드. 빈 문자열은 None(Oracle ''=NULL), title은 NOT NULL 보강."""
    rows = []
    for r in postings.to_dict("records"):
        rows.append({
            "source": r["source"], "external_id": r["external_id"],
            "company_name": (r.get("company_name") or None),
            "title": (str(r.get("title") or "").strip() or "(제목 없음)"),
            "url": (r.get("url") or None),
            "position": r.get("position"),
            "region": r.get("sido"),                      # 표준 시·도 → market.region
            "sigungu": (r.get("sigungu") or None),
            "posted_date": _date(r.get("posted_date")),
            "deadline": _date(r.get("deadline")),
            "collected_at": collected_at,
            "base_date": _date(r.get("base_date")),
        })
    return rows


def _id_map(cur) -> dict:
    """(source, external_id) → market_job_postings.id (스택 FK 연결용)."""
    cur.execute("SELECT source, external_id, id FROM market_job_postings")
    return {(s, e): i for s, e, i in cur.fetchall()}


def _stack_rows(stacks: pd.DataFrame, id_map: dict) -> list:
    rows, missing = [], 0
    for r in stacks.to_dict("records"):
        mj = id_map.get((r["source"], r["external_id"]))
        if mj is None:                                    # 매칭 공고 없으면 건너뜀(격리)
            missing += 1
            continue
        rows.append({"market_job_id": mj, "stack_name": r["stack_name"],
                     "matched_keyword": (r.get("matched_keyword") or None)})
    if missing:
        log.warning("스택 %d행: 매칭 공고 id 없음 → 건너뜀", missing)
    return rows


def _record_run(cur, base_date: str, extracted: int, loaded: int) -> None:
    """4일차 최소 실행 로그(SUCCESS 1줄). 5일차에서 RUNNING→SUCCESS/FAILED 전이로 확장."""
    cur.execute("""
        INSERT INTO etl_runs (id, source, started_at, ended_at, status,
                              extracted_count, loaded_count, base_date)
        VALUES (SEQ_ETL_RUNS.NEXTVAL, :source, SYSTIMESTAMP, SYSTIMESTAMP,
                'SUCCESS', :extracted, :loaded, :base_date)
    """, {"source": "all", "extracted": extracted, "loaded": loaded,
          "base_date": _date(base_date)})


def run(base_date: str | None = None):
    base_date = base_date or date.today().isoformat()
    postings, stacks, monthly, region, trends = build_analytics.run(base_date)
    collected_at = datetime.now()

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.executemany(SQL_POSTING, _posting_rows(postings, collected_at))
        log.info("market_job_postings MERGE %d행", len(postings))

        srows = _stack_rows(stacks, _id_map(cur))         # 공고 id 확보 후 스택 연결
        if srows:
            cur.executemany(SQL_STACK, srows)
        log.info("market_job_stacks MERGE %d행", len(srows))

        cur.executemany(SQL_MONTHLY, _records(monthly))
        cur.executemany(SQL_REGION, _records(region))
        if len(trends):
            cur.executemany(SQL_TREND, _records(trends))
        log.info("analytics MERGE | 월별 %d · 지역 %d · 추세 %d", len(monthly), len(region), len(trends))

        _record_run(cur, base_date, extracted=len(postings), loaded=len(postings) + len(srows))
        conn.commit()                                     # 모든 단계 성공 시에만 커밋
        log.info("Oracle 적재 커밋 완료 (base_date=%s)", base_date)
    except Exception as e:
        conn.rollback()                                   # 실패 시 직전 성공 데이터 유지
        raise LoadError(f"Oracle 적재 실패 → 롤백: {e}") from e
    finally:
        conn.close()


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else None)
