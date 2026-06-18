"""Processed(공고/스택) → 월별·직무·지역 집계(고유 공고 기준, ALL 롤업) → HDFS Aggregate. 4일차."""
import sys
from datetime import date

import pandas as pd

from etl.config import settings
from etl.common import hdfs_client
from etl.common.logger import get_logger

log = get_logger("aggregate")
PROC_DIR = settings.DATA_DIR / "processed"
AGG_DIR = settings.DATA_DIR / "aggregate"
ALL = "ALL"                                            # "전체" 센티넬(NULL 대신, schema.sql과 일치)


def _read_processed(base_date: str):
    """base_date 파티션의 공고/스택 parquet을 소스 무관하게 모아 읽는다."""
    pdir = PROC_DIR / f"base_date={base_date}"
    posts = [pd.read_parquet(f) for f in sorted(pdir.glob("postings_*.parquet"))]
    stks = [pd.read_parquet(f) for f in sorted(pdir.glob("stacks_*.parquet"))]
    if not posts:
        raise FileNotFoundError(f"processed 공고 없음: {pdir} (3일차 load_processed 먼저 실행)")
    postings = pd.concat(posts, ignore_index=True)
    stacks = (pd.concat(stks, ignore_index=True) if stks else
              pd.DataFrame(columns=["source", "external_id", "stack_name", "matched_keyword"]))
    return postings, stacks


def _base_month(df: pd.DataFrame) -> pd.Series:
    """posted_date(YYYY-MM-DD) → base_month(YYYY-MM). 파싱불가/결측은 base_date 월로 대체."""
    m = df["posted_date"].fillna("").astype(str).str.slice(0, 7)
    fallback = df["base_date"].astype(str).str.slice(0, 7)
    return m.where(m.str.len() == 7, fallback)


def _fact(postings: pd.DataFrame) -> pd.DataFrame:
    """공고 1건 = uid 1개인 집계 원천. (source, external_id) 중복은 1건으로."""
    df = postings.drop_duplicates(["source", "external_id"]).copy()
    df["uid"] = df["source"].astype(str) + ":" + df["external_id"].astype(str)
    df["base_month"] = _base_month(df)
    df["position"] = df["position"].fillna("기타")
    df["region"] = df["sido"].fillna("미분류")
    return df[["uid", "base_month", "position", "region"]]


def _count_unique(fact: pd.DataFrame, roll_position: bool, roll_region: bool) -> pd.DataFrame:
    """차원을 ALL로 치환(롤업)한 뒤 (base_month, position, region)별 고유 공고 수."""
    g = fact.copy()
    if roll_position:
        g["position"] = ALL
    if roll_region:
        g["region"] = ALL
    return (g.groupby(["base_month", "position", "region"])["uid"]
             .nunique().reset_index(name="posting_count"))


def build_monthly(fact: pd.DataFrame) -> pd.DataFrame:
    """4개 조합(실제/ALL × 실제/ALL) → 월별 공고 수(롤업 포함)."""
    parts = [_count_unique(fact, rp, rr) for rp in (False, True) for rr in (False, True)]
    return pd.concat(parts, ignore_index=True)


def build_region(fact: pd.DataFrame) -> pd.DataFrame:
    """지역 분포: region은 실제값만(ALL 없음), position은 실제/ALL 둘 다."""
    parts = [_count_unique(fact, rp, False) for rp in (False, True)]
    return pd.concat(parts, ignore_index=True)


def _count_stack(sf: pd.DataFrame, roll_position: bool, roll_region: bool) -> pd.DataFrame:
    g = sf.copy()
    if roll_position:
        g["position"] = ALL
    if roll_region:
        g["region"] = ALL
    return (g.groupby(["base_month", "position", "region", "stack_name"])["uid"]
             .nunique().reset_index(name="posting_count"))


def build_stack_trends(fact: pd.DataFrame, stacks: pd.DataFrame, monthly: pd.DataFrame) -> pd.DataFrame:
    """스택별 고유 공고 수 + 비율. 분모 = 같은 (월·직무·지역)의 전체 고유 공고 수."""
    cols = ["base_month", "position", "region", "stack_name", "posting_count", "ratio"]
    if stacks.empty:
        return pd.DataFrame(columns=cols)

    sf = stacks.copy()
    sf["uid"] = sf["source"].astype(str) + ":" + sf["external_id"].astype(str)
    sf = sf.merge(fact, on="uid", how="inner")          # 스택 행에 월·직무·지역 부착
    sf = sf.drop_duplicates(["uid", "stack_name"])       # 한 공고에서 같은 스택은 1번만

    parts = [_count_stack(sf, rp, rr) for rp in (False, True) for rr in (False, True)]
    trends = pd.concat(parts, ignore_index=True)

    denom = monthly.rename(columns={"posting_count": "_total"})
    trends = trends.merge(denom, on=["base_month", "position", "region"], how="left")
    trends["ratio"] = (trends["posting_count"] / trends["_total"] * 100).round(2).astype("Float64")
    trends.loc[trends["_total"].isna() | (trends["_total"] == 0), "ratio"] = pd.NA  # 분모0=NULL(데이터부족)
    return trends.drop(columns=["_total"])[cols]


def run(base_date: str | None = None):
    base_date = base_date or date.today().isoformat()
    postings, stacks = _read_processed(base_date)
    fact = _fact(postings)
    monthly = build_monthly(fact)
    region = build_region(fact)
    trends = build_stack_trends(fact, stacks, monthly)

    out_dir = AGG_DIR / f"base_date={base_date}"
    out_dir.mkdir(parents=True, exist_ok=True)
    remote = f"{settings.HDFS_ROOT}/aggregate/base_date={base_date}"
    hdfs_client.mkdir(remote)
    for name, df in {"monthly_jobs.parquet": monthly,
                     "region_jobs.parquet": region,
                     "stack_trends.parquet": trends}.items():
        local = out_dir / name
        df.to_parquet(local, index=False)
        hdfs_client.upload(str(local), f"{remote}/{name}")
        log.info("집계 적재: %s (%d행) -> %s/%s", name, len(df), remote, name)

    log.info("집계 완료 base_date=%s | 고유공고 %d · 스택행 %d · 월별 %d · 지역 %d · 추세 %d",
             base_date, fact["uid"].nunique(), len(stacks), len(monthly), len(region), len(trends))
    return postings, stacks, monthly, region, trends


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else None)