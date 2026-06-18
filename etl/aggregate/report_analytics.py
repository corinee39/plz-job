"""집계(parquet) → IT 채용 분석 리포트(월별·지역별·기술스택별·교차). 사람인 IT 공고 분석용.

build_analytics.py가 적재한 monthly_jobs/region_jobs/stack_trends를 읽어
사람이 읽는 마크다운 리포트로 요약한다. 집계(적재)와 분석(해석)을 분리한다.
순수 함수(DataFrame in/out)라 집계 산출물만 있으면 어디서든 재사용·테스트 가능.
"""
import sys
from datetime import date

import pandas as pd

from etl.config import settings
from etl.common.logger import get_logger

log = get_logger("report")
AGG_DIR = settings.DATA_DIR / "aggregate"
ALL = "ALL"                                            # build_analytics와 동일한 롤업 센티넬


def load_aggregates(base_date: str, agg_dir=None):
    """base_date 파티션의 집계 3종을 읽는다. agg_dir로 위치 override(테스트용)."""
    d = (agg_dir or AGG_DIR) / f"base_date={base_date}"
    monthly = pd.read_parquet(d / "monthly_jobs.parquet")
    region = pd.read_parquet(d / "region_jobs.parquet")
    stacks = pd.read_parquet(d / "stack_trends.parquet")
    return monthly, region, stacks


def _total_postings(monthly: pd.DataFrame) -> int:
    """전체 고유 공고 수 = (position=ALL, region=ALL)의 월별 합(공고는 한 달에만 속함)."""
    m = monthly[(monthly.position == ALL) & (monthly.region == ALL)]
    return int(m["posting_count"].sum())


# ── 순수 분석 함수 ───────────────────────────────────────────────────────────

def monthly_trend(monthly: pd.DataFrame) -> pd.DataFrame:
    """월별 공고 수 + 전월 대비 증감(건수·%). position=ALL, region=ALL 기준."""
    m = (monthly[(monthly.position == ALL) & (monthly.region == ALL)]
         .groupby("base_month", as_index=False)["posting_count"].sum()
         .sort_values("base_month").reset_index(drop=True))
    m["전월대비"] = m["posting_count"].diff().astype("Int64")
    prev = m["posting_count"].shift(1)
    m["증감률(%)"] = ((m["posting_count"] - prev) / prev * 100).round(1)
    return m.rename(columns={"base_month": "월", "posting_count": "공고수"})


def position_breakdown(monthly: pd.DataFrame) -> pd.DataFrame:
    """직무별 분포(직무=실제값, region=ALL, 전 기간 합) + 점유율."""
    p = (monthly[(monthly.position != ALL) & (monthly.region == ALL)]
         .groupby("position", as_index=False)["posting_count"].sum()
         .sort_values("posting_count", ascending=False).reset_index(drop=True))
    total = p["posting_count"].sum()
    p["점유율(%)"] = (p["posting_count"] / total * 100).round(1) if total else 0.0
    return p.rename(columns={"position": "직무", "posting_count": "공고수"})


def top_regions(region: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    """지역별 공고 분포 top_n(직무=ALL, 전 기간 합) + 점유율."""
    r = (region[(region.position == ALL) & (region.region != ALL)]
         .groupby("region", as_index=False)["posting_count"].sum()
         .sort_values("posting_count", ascending=False).reset_index(drop=True))
    total = r["posting_count"].sum()
    r["점유율(%)"] = (r["posting_count"] / total * 100).round(1) if total else 0.0
    return r.head(top_n).rename(columns={"region": "지역", "posting_count": "공고수"})


def top_stacks(stacks: pd.DataFrame, total_postings: int, top_n: int = 15) -> pd.DataFrame:
    """기술스택 수요 top_n(직무=ALL, region=ALL, 전 기간 합) + 전체 공고 대비 비율."""
    s = (stacks[(stacks.position == ALL) & (stacks.region == ALL)]
         .groupby("stack_name", as_index=False)["posting_count"].sum()
         .sort_values("posting_count", ascending=False).reset_index(drop=True))
    s["요구율(%)"] = (s["posting_count"] / total_postings * 100).round(1) if total_postings else 0.0
    return s.head(top_n).rename(columns={"stack_name": "기술스택", "posting_count": "공고수"})


def stack_by_region(stacks: pd.DataFrame, per_region: int = 3, top_regions_n: int = 5) -> pd.DataFrame:
    """주요 지역별 top 기술스택(직무=ALL). 지역은 공고 많은 순 top_regions_n개."""
    base = stacks[(stacks.position == ALL) & (stacks.region != ALL)]
    if base.empty:
        return pd.DataFrame(columns=["지역", "기술스택", "공고수", "요구율(%)"])
    order = (base.groupby("region")["posting_count"].sum()
             .sort_values(ascending=False).head(top_regions_n).index)
    rows = []
    for reg in order:
        top = (base[base.region == reg].sort_values("posting_count", ascending=False)
               .head(per_region))
        for _, t in top.iterrows():
            rows.append({"지역": reg, "기술스택": t["stack_name"],
                         "공고수": int(t["posting_count"]),
                         "요구율(%)": t["ratio"] if pd.notna(t["ratio"]) else None})
    return pd.DataFrame(rows)


def monthly_stack_trend(stacks: pd.DataFrame, top_n: int = 5) -> pd.DataFrame:
    """주요 스택 top_n의 월별 공고 수 추이(직무=ALL, region=ALL). 월×스택 피벗."""
    base = stacks[(stacks.position == ALL) & (stacks.region == ALL)]
    if base.empty:
        return pd.DataFrame()
    top = (base.groupby("stack_name")["posting_count"].sum()
           .sort_values(ascending=False).head(top_n).index)
    piv = (base[base.stack_name.isin(top)]
           .pivot_table(index="base_month", columns="stack_name",
                        values="posting_count", aggfunc="sum", fill_value=0)
           .reindex(columns=top).reset_index().rename(columns={"base_month": "월"}))
    return piv


# ── 렌더링 ───────────────────────────────────────────────────────────────────

def _md_table(df: pd.DataFrame) -> str:
    """DataFrame → GitHub 마크다운 표(tabulate 의존 없이). 빈 표는 안내문."""
    if df.empty:
        return "_(데이터 없음)_"
    cols = [str(c) for c in df.columns]
    head = "| " + " | ".join(cols) + " |"
    sep = "| " + " | ".join("---" for _ in cols) + " |"
    body = ["| " + " | ".join("" if pd.isna(v) else str(v) for v in row) + " |"
            for row in df.itertuples(index=False)]
    return "\n".join([head, sep, *body])


def render_markdown(base_date: str, monthly, region, stacks, top_n: int = 15) -> str:
    """집계 3종 → IT 채용 분석 리포트 마크다운 문자열."""
    total = _total_postings(monthly)
    months = monthly_trend(monthly)
    month_span = f"{months['월'].min()} ~ {months['월'].max()}" if len(months) else "-"
    n_region = region[(region.position == ALL) & (region.region != ALL)]["region"].nunique()
    n_stack = stacks[(stacks.position == ALL) & (stacks.region == ALL)]["stack_name"].nunique()

    parts = [
        f"# IT 채용공고 분석 리포트 (base_date={base_date})",
        "",
        "## 0. 개요",
        f"- 총 고유 공고: **{total}건**",
        f"- 분석 기간(게시월): **{month_span}**",
        f"- 지역 수: **{n_region}곳** · 기술스택 종류: **{n_stack}종**",
        "",
        "## 1. 월별 채용 추세",
        _md_table(months),
        "",
        "## 2. 직무별 분포",
        _md_table(position_breakdown(monthly)),
        "",
        "## 3. 지역별 분포 (Top)",
        _md_table(top_regions(region, top_n=min(top_n, 10))),
        "",
        f"## 4. 기술스택 수요 Top {top_n}",
        "> 요구율 = 해당 스택을 요구한 공고 / 전체 공고",
        _md_table(top_stacks(stacks, total, top_n=top_n)),
        "",
        "## 5. 지역별 주요 기술스택",
        _md_table(stack_by_region(stacks)),
        "",
        "## 6. 주요 기술스택 월별 추이",
        _md_table(monthly_stack_trend(stacks)),
        "",
    ]
    return "\n".join(parts)


def build_report(base_date: str | None = None, top_n: int = 15,
                 agg_dir=None, save: bool = True) -> str:
    """집계 파티션을 읽어 IT 분석 리포트(.md) 생성·저장하고 마크다운 문자열을 반환."""
    base_date = base_date or date.today().isoformat()
    monthly, region, stacks = load_aggregates(base_date, agg_dir)
    md = render_markdown(base_date, monthly, region, stacks, top_n)

    if save:
        out = (agg_dir or AGG_DIR) / f"base_date={base_date}" / "report_it.md"
        out.write_text(md, encoding="utf-8")
        log.info("IT 분석 리포트 저장: %s", out)
    log.info("리포트 요약 base_date=%s | 총공고 %d · 월수 %d · 지역 %d · 스택 %d종",
             base_date, _total_postings(monthly),
             monthly[(monthly.position == ALL) & (monthly.region == ALL)]["base_month"].nunique(),
             region[(region.position == ALL) & (region.region != ALL)]["region"].nunique(),
             stacks[(stacks.position == ALL) & (stacks.region == ALL)]["stack_name"].nunique())
    return md


if __name__ == "__main__":
    print(build_report(sys.argv[1] if len(sys.argv) > 1 else None))
