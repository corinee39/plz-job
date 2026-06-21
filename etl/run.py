"""사람인 크롤링 → 태깅 → 집계 → CSV/프론트 JSON 산출 오케스트레이터.

사용 예:
    python run.py --start-page 1 --end-page 5 --keywords 백엔드,프론트엔드,데이터,AI,모바일,DevOps

raw_jobs.csv는 회차마다 덮어쓰지 않고 누적된다(rec_idx 기준 dedup, 동일
공고가 재수집되면 최신 회차로 갱신). 집계(DASH-04/05/06)는 누적 데이터 중
마감되지 않은("is_open") 공고만 사용해 옛 마감 공고로 비율이 왜곡되지 않게 한다.

DASH-04/05를 최근 20페이지 분량 기준으로 그리고 싶다면, 한 번에 20페이지를
긁지 말고 차단 위험을 줄이기 위해 5페이지씩 나눠 여러 회차로 실행한다.
누적 로직이 회차별 결과를 합쳐주므로 최종적으로 1~20페이지가 모두 쌓인다:
    python run.py --start-page 1  --end-page 5  --keywords ...
    python run.py --start-page 6  --end-page 10 --keywords ...
    python run.py --start-page 11 --end-page 15 --keywords ...
    python run.py --start-page 16 --end-page 20 --keywords ...

산출물:
    data/output/raw_jobs.csv                  크롤링 원본 공고(누적)
    data/output/enriched_jobs.csv             스택/지역/직무/마감 태깅 결과(누적)
    data/output/market_stack_trends.csv       DASH-04 (유효 공고 기준)
    data/output/market_region_distribution.csv DASH-05 (유효 공고 기준)
    ../frontend/src/mocks/data/market.json    프론트 대시보드 연동 데이터
"""
import argparse
import json
from datetime import date
from pathlib import Path

import pandas as pd

from analyze import market
from common.logger import get_logger
from crawl import saramin
from load import hdfs_writer, oracle_loader
from transform import enrich

log = get_logger("run")

ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT / "data" / "output"
FRONTEND_DATA = ROOT.parent / "frontend" / "src" / "mocks" / "data"

DEFAULT_KEYWORDS = ["백엔드", "프론트엔드", "데이터", "AI", "모바일", "DevOps"]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="사람인 채용공고 크롤링·분석 ETL")
    p.add_argument("--keywords", default=",".join(DEFAULT_KEYWORDS),
                   help="검색 키워드(쉼표 구분)")
    p.add_argument("--start-page", type=int, default=1,
                   help="키워드당 수집 시작 페이지(1-base, 포함)")
    p.add_argument("--end-page", type=int, default=1,
                   help="키워드당 수집 종료 페이지(포함). 예: 6~10페이지만 "
                        "수집하려면 --start-page 6 --end-page 10")
    p.add_argument("--delay", type=float, default=1.5,
                   help="요청 간 지연(초)")
    p.add_argument("--top", type=int, default=10,
                   help="집계 상위 N개")
    p.add_argument("--skip-load", action="store_true",
                   help="HDFS/Oracle 적재를 건너뛰고 CSV/프론트 JSON만 생성(개발용)")
    return p.parse_args()


def accumulate_raw(new_rows: list[dict], raw_path: Path) -> pd.DataFrame:
    """기존 raw_jobs.csv + 이번 회차 결과를 합쳐 rec_idx 기준 dedup.

    rec_idx가 없는 항목은 company|title을 대체 키로 사용한다.
    같은 키가 여러 회차에 걸쳐 있으면 collected_date가 가장 늦은(최신) 행을 남긴다.
    """
    new_df = pd.DataFrame(new_rows)
    if raw_path.exists():
        old_df = pd.read_csv(raw_path, dtype=str)
        combined = pd.concat([old_df, new_df], ignore_index=True)
    else:
        combined = new_df
    combined = combined.fillna("")  # 과거 스키마에 없던 컬럼은 빈 문자열로 보정

    dedup_key = combined["rec_idx"].where(
        combined["rec_idx"].astype(bool),
        combined["company"] + "|" + combined["title"],
    )
    combined = (
        combined.assign(_dedup_key=dedup_key)
        .sort_values("collected_date")
        .drop_duplicates(subset="_dedup_key", keep="last")
        .drop(columns="_dedup_key")
        .reset_index(drop=True)
    )
    return combined


def export_frontend_json(agg: dict, base_date: str) -> Path:
    """프론트 MSW 핸들러가 import할 market.json 생성."""
    FRONTEND_DATA.mkdir(parents=True, exist_ok=True)
    payload = {
        "dataBaseDate": base_date,
        "stackTrends": {"dataBaseDate": base_date, "trends": agg["trends"]},
        "regionDistribution": {"dataBaseDate": base_date, "regions": agg["regions"]},
        "userComparison": {"dataBaseDate": base_date, "comparison": agg["comparison"]},
    }
    out = FRONTEND_DATA / "market.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2),
                   encoding="utf-8")
    return out


def load_to_warehouse(rows: list[dict], valid_df: pd.DataFrame,
                      base_date: str, base_date_obj: date) -> None:
    """HDFS raw 적재존 + Oracle 시장 6테이블 적재(ETL_RUNS 이력 포함).

    CSV/프론트 JSON 은 이미 산출된 뒤 호출되므로, 적재 실패는
    ETL_RUNS 에 FAILED 로 기록하되 예외를 다시 던져 종료 코드에 반영한다.
    """
    base_month = base_date[:7]
    # Oracle 집계는 표시용(top_n)이 아닌 전체를 적재한다.
    all_trends = market.stack_trends(valid_df, top_n=None)
    all_regions = market.region_distribution(valid_df, top_n=None)

    conn = oracle_loader.connect()
    run_id = oracle_loader.start_run(conn, base_date_obj)
    try:
        hdfs_path = hdfs_writer.write_raw(rows, base_date, "all")
        log.info("HDFS raw: %s", hdfs_path)
        loaded = oracle_loader.load_market_data(
            conn, valid_df.to_dict("records"), base_date_obj, base_month,
            all_trends, all_regions, len(valid_df))
        oracle_loader.finish_run(conn, run_id, "SUCCESS",
                                 extracted=len(rows), loaded=loaded)
        log.info("적재 완료(run_id=%d): 추출 %d, 적재 %d", run_id, len(rows), loaded)
    except Exception as e:
        oracle_loader.finish_run(conn, run_id, "FAILED", extracted=len(rows),
                                 error=str(e))
        log.error("적재 실패(run_id=%d): %s", run_id, e)
        raise
    finally:
        conn.close()


def main() -> None:
    args = parse_args()
    keywords = [k.strip() for k in args.keywords.split(",") if k.strip()]
    base_date = date.today().isoformat()
    base_date_obj = date.today()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1) 크롤링 + 누적
    rows = saramin.crawl(keywords, start_page=args.start_page,
                         end_page=args.end_page, delay=args.delay,
                         collected_date=base_date)
    if not rows:
        log.error("수집된 공고가 없습니다. 셀렉터 변경/차단 여부를 확인하세요.")
        return
    raw_path = OUTPUT_DIR / "raw_jobs.csv"
    combined_raw = accumulate_raw(rows, raw_path)
    combined_raw.to_csv(raw_path, index=False, encoding="utf-8-sig")
    log.info("누적 raw 공고 %d건 (이번 회차 수집 %d건)", len(combined_raw), len(rows))

    # 2) 태깅(누적 데이터 전체에 적용)
    df = enrich.enrich(combined_raw.to_dict("records"))
    df.to_csv(OUTPUT_DIR / "enriched_jobs.csv",
              index=False, encoding="utf-8-sig")

    # 3) 마감 미도래(유효) 공고만 집계 대상으로 필터링
    valid_df = df[df["is_open"]]
    log.info("유효 공고 %d / 누적 %d건으로 집계", len(valid_df), len(df))

    # 4) 집계
    agg = market.build(valid_df, top_n=args.top)
    pd.DataFrame(agg["trends"]).to_csv(
        OUTPUT_DIR / "market_stack_trends.csv", index=False, encoding="utf-8-sig")
    pd.DataFrame(agg["regions"]).to_csv(
        OUTPUT_DIR / "market_region_distribution.csv", index=False, encoding="utf-8-sig")

    # 5) 프론트 연동 JSON
    out = export_frontend_json(agg, base_date)
    log.info("프론트 데이터: %s", out)

    # 6) HDFS raw 적재존 + Oracle 시장 6테이블 적재
    if args.skip_load:
        log.info("--skip-load: HDFS/Oracle 적재를 건너뜀(CSV/JSON만 생성)")
    else:
        load_to_warehouse(rows, valid_df, base_date, base_date_obj)

    log.info("완료. 기준일=%s 유효공고=%d 스택=%d 지역=%d",
             base_date, len(valid_df), len(agg["trends"]), len(agg["regions"]))


if __name__ == "__main__":
    main()
