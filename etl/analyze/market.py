"""태깅된 공고 DataFrame → 대시보드 집계.

프론트 대시보드(DASH-04/05/06)가 먹는 형태로 산출한다:
- stack_trends : [{stack, postingCount, ratio}]      (DASH-04)
- region_dist  : [{region, postingCount}]            (DASH-05)
- comparison   : [{stack, userRatio, marketRatio, gap}] (DASH-06, marketRatio만 실데이터)
"""
import pandas as pd

from common.logger import get_logger

log = get_logger("analyze.market")

# DASH-06: 사용자 본인 지원 비율은 크롤링 무관(별도 시스템) → 당분간 목 값 유지.
# 프론트 기존 목과 동일한 값. marketRatio/gap만 실데이터로 갱신한다.
DEFAULT_USER_RATIO = {
    "Java": 40.0,
    "Spring": 35.0,
    "React": 20.0,
    "Python": 10.0,
    "Kubernetes": 5.0,
}


def stack_trends(df: pd.DataFrame, top_n: int | None = 10) -> list[dict]:
    """스택별 공고 수와 비율(전체 공고 대비). 내림차순 top_n(None이면 전체)."""
    if df.empty:
        return []
    total = len(df)
    exploded = (
        df.assign(stack=df["stacks"].str.split("|"))
        .explode("stack")
    )
    exploded = exploded[exploded["stack"].astype(bool) & exploded["stack"].notna()]
    if exploded.empty:
        return []
    counts = exploded.groupby("stack")["rec_idx"].nunique().sort_values(ascending=False)
    if top_n is not None:
        counts = counts.head(top_n)
    out = []
    for stack, cnt in counts.items():
        out.append({
            "stack": stack,
            "postingCount": int(cnt),
            "ratio": round(cnt / total * 100, 1),
        })
    return out


def region_distribution(df: pd.DataFrame, top_n: int | None = 10) -> list[dict]:
    """시·도별 공고 수. '기타' 제외, 내림차순 top_n(None이면 전체)."""
    if df.empty:
        return []
    counts = (
        df[df["region"] != "기타"]
        .groupby("region")["rec_idx"].nunique()
        .sort_values(ascending=False)
    )
    if top_n is not None:
        counts = counts.head(top_n)
    return [{"region": region, "postingCount": int(cnt)}
            for region, cnt in counts.items()]


def user_comparison(trends: list[dict],
                    user_ratio: dict | None = None) -> list[dict]:
    """내 지원 비율 vs 시장 비율 비교. 시장 비율은 stack_trends에서 매핑."""
    user_ratio = user_ratio or DEFAULT_USER_RATIO
    market_by_stack = {t["stack"]: t["ratio"] for t in trends}
    out = []
    for stack, u in user_ratio.items():
        m = market_by_stack.get(stack, 0.0)
        out.append({
            "stack": stack,
            "userRatio": round(u, 1),
            "marketRatio": round(m, 1),
            "gap": round(u - m, 1),
        })
    return out


def build(df: pd.DataFrame, top_n: int = 10) -> dict:
    """3종 집계를 한 번에 산출."""
    # comparison은 전체 스택에서 시장 비율을 찾아야 하므로 full 집계를 별도로 구한다.
    all_trends = stack_trends(df, top_n=None)
    trends = all_trends[:top_n]
    regions = region_distribution(df, top_n)
    comparison = user_comparison(all_trends)
    log.info("집계 완료: stacks=%d regions=%d comparison=%d",
             len(trends), len(regions), len(comparison))
    return {"trends": trends, "regions": regions, "comparison": comparison}
