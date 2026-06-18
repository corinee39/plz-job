import pandas as pd

from etl.aggregate.report_analytics import (
    monthly_trend, position_breakdown, top_regions, top_stacks, _md_table,
)

ALL = "ALL"


def _monthly():
    return pd.DataFrame([
        {"base_month": "2026-05", "position": ALL, "region": ALL, "posting_count": 10},
        {"base_month": "2026-06", "position": ALL, "region": ALL, "posting_count": 15},
        {"base_month": "2026-06", "position": "백엔드", "region": ALL, "posting_count": 9},
        {"base_month": "2026-06", "position": "데이터", "region": ALL, "posting_count": 6},
    ])


def test_monthly_trend_computes_mom():
    mt = monthly_trend(_monthly())
    assert list(mt["공고수"]) == [10, 15]              # 월 오름차순
    assert mt.iloc[1]["전월대비"] == 5
    assert mt.iloc[1]["증감률(%)"] == 50.0
    assert pd.isna(mt.iloc[0]["전월대비"])              # 첫 달은 비교 불가


def test_position_breakdown_share():
    p = position_breakdown(_monthly())                 # ALL 행은 제외, 직무 실제값만
    assert list(p["직무"]) == ["백엔드", "데이터"]       # 공고수 내림차순
    assert p.iloc[0]["점유율(%)"] == 60.0              # 9 / (9+6)


def test_top_regions_excludes_all_and_shares():
    region = pd.DataFrame([
        {"base_month": "2026-06", "position": ALL, "region": "서울", "posting_count": 6},
        {"base_month": "2026-06", "position": ALL, "region": "경기", "posting_count": 4},
        {"base_month": "2026-06", "position": ALL, "region": ALL, "posting_count": 10},  # 롤업 제외
        {"base_month": "2026-06", "position": "백엔드", "region": "서울", "posting_count": 3},  # 직무≠ALL 제외
    ])
    r = top_regions(region)
    assert list(r["지역"]) == ["서울", "경기"]
    assert r.iloc[0]["공고수"] == 6 and r.iloc[0]["점유율(%)"] == 60.0


def test_top_stacks_ratio_against_total():
    stacks = pd.DataFrame([
        {"base_month": "2026-06", "position": ALL, "region": ALL, "stack_name": "Java",
         "posting_count": 6, "ratio": 60.0},
        {"base_month": "2026-06", "position": ALL, "region": ALL, "stack_name": "Python",
         "posting_count": 3, "ratio": 30.0},
        {"base_month": "2026-06", "position": "백엔드", "region": ALL, "stack_name": "Java",
         "posting_count": 4, "ratio": 80.0},                # 직무≠ALL 제외
    ])
    s = top_stacks(stacks, total_postings=10, top_n=5)
    assert list(s["기술스택"]) == ["Java", "Python"]
    assert s.iloc[0]["공고수"] == 6 and s.iloc[0]["요구율(%)"] == 60.0


def test_md_table_empty_and_format():
    assert _md_table(pd.DataFrame()) == "_(데이터 없음)_"
    t = _md_table(pd.DataFrame([{"a": 1, "b": 2}]))
    lines = t.splitlines()
    assert lines[0] == "| a | b |" and lines[1] == "| --- | --- |"
    assert lines[2] == "| 1 | 2 |"
