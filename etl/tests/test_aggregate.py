import pandas as pd

from etl.aggregate.build_analytics import _fact, build_monthly, build_region, build_stack_trends


def _postings():
    base = {"company_name": "A", "url": "", "sigungu": "", "deadline": None,
            "base_date": "2026-06-18", "description": ""}
    return pd.DataFrame([
        {**base, "source": "t", "external_id": "1", "title": "백엔드",
         "position": "백엔드", "sido": "서울", "posted_date": "2026-06-01"},
        {**base, "source": "t", "external_id": "2", "title": "프런트",
         "position": "프런트엔드", "sido": "서울", "posted_date": "2026-06-10"},
        {**base, "source": "t", "external_id": "2", "title": "프런트",   # 중복 공고
         "position": "프런트엔드", "sido": "서울", "posted_date": "2026-06-10"},
    ])


def _stacks():
    return pd.DataFrame([
        {"source": "t", "external_id": "1", "stack_name": "Java", "matched_keyword": "java"},
        {"source": "t", "external_id": "2", "stack_name": "React", "matched_keyword": "react"},
    ])


def test_monthly_all_rollup_counts_unique():
    monthly = build_monthly(_fact(_postings()))
    allall = monthly[(monthly.position == "ALL") & (monthly.region == "ALL")]
    assert int(allall["posting_count"].iloc[0]) == 2     # 중복 제거 후 고유 공고 2건


def test_region_distribution_has_no_all_region():
    region = build_region(_fact(_postings()))
    assert "ALL" not in set(region["region"])            # 지역 분포엔 ALL 지역 없음
    seoul_all = region[(region.region == "서울") & (region.position == "ALL")]
    assert int(seoul_all["posting_count"].iloc[0]) == 2


def test_stack_ratio_uses_unique_postings_denominator():
    fact = _fact(_postings())
    monthly = build_monthly(fact)
    trends = build_stack_trends(fact, _stacks(), monthly)
    java = trends[(trends.position == "ALL") & (trends.region == "ALL")
                  & (trends.stack_name == "Java")]
    assert float(java["ratio"].iloc[0]) == 50.0          # Java 1건 / 전체 고유 2건 = 50%
