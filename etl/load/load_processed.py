"""Transform 산출물(공고/스택)을 Processed 파티션에 분리 적재 + 품질 요약."""
import sys
from datetime import date

import pandas as pd

from etl.config import settings
from etl.common import hdfs_client
from etl.common.logger import get_logger
from etl.transform.read_raw import read_records
from etl.transform.normalize_jobs import normalize
from etl.transform.extract_stacks import extract_stacks

log = get_logger("load_processed")
PROC_DIR = settings.DATA_DIR / "processed"


def _quality(source, raw_n, postings, stacks):
    n = len(postings)
    etc = round((postings["position"] == "기타").mean() * 100, 1) if n else 0.0
    unclass = int((postings["sido"] == "미분류").sum())
    miss_date = int(postings["posted_date"].isna().sum())
    miss_req = int(postings[["company_name", "title"]]
                   .replace("", pd.NA).isna().any(axis=1).sum())
    log.info("[%s] 품질요약 | raw=%d 중복제거=%d processed=%d 필수결측=%d "
             "마감·게시일파싱실패=%d 기타직무=%.1f%% 지역미분류=%d 스택행=%d",
             source, raw_n, raw_n - n, n, miss_req, miss_date, etc, unclass, len(stacks))


def run(source: str, base_date: str | None = None, collected_date: str | None = None):
    base_date = base_date or date.today().isoformat()
    collected_date = collected_date or base_date

    records = read_records(source, collected_date)
    postings = normalize(source, records, base_date)
    stacks = extract_stacks(postings)

    out_dir = PROC_DIR / f"base_date={base_date}"
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = {f"postings_{source}.parquet": postings, f"stacks_{source}.parquet": stacks}
    remote = f"{settings.HDFS_ROOT}/processed/base_date={base_date}"
    hdfs_client.mkdir(remote)
    for name, df in paths.items():
        local = out_dir / name
        df.to_parquet(local, index=False)                 # CSV가 필요하면 to_csv로 교체
        hdfs_client.upload(str(local), f"{remote}/{name}")
        log.info("적재: %s (%d행) -> %s/%s", name, len(df), remote, name)

    _quality(source, len(records), postings, stacks)
    return postings, stacks


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else settings.DATA_SOURCE,
        base_date=sys.argv[2] if len(sys.argv) > 2 else None,
        collected_date=sys.argv[3] if len(sys.argv) > 3 else None)