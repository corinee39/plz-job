import { http } from "msw";
import { ok } from "../helpers.js";
// 시장 데이터(DASH-04/05/06)는 etl/run.py 크롤링·집계 산출물에서 생성된다.
import market from "../data/market.json";

export const dashboardHandlers = [
  // DASH-03, ETL-10 — KPI 요약
  http.get("*/api/dashboard/summary", () =>
    ok({
      thisMonthApplications: 8,
      inProgressCount: 6,
      upcomingSchedules: 3,
      finalPassCount: 1,
      // 지난달 대비 증감 — KPI 카드 추세 표시용(양수=증가)
      applicationsDelta: -2,
      inProgressDelta: 1,
      upcomingDelta: 0,
      finalPassDelta: 1,
      overallPassRate: 12.5,
      sampleSize: 30,
      dataBaseDate: "2026-06-16",
    })
  ),

  // DASH-01 — 월별 지원 추이
  http.get("*/api/dashboard/monthly-applications", () =>
    ok({
      monthly: [
        { month: "2026-01", applied: 3 },
        { month: "2026-02", applied: 5 },
        { month: "2026-03", applied: 8 },
        { month: "2026-04", applied: 12 },
        { month: "2026-05", applied: 10 },
        { month: "2026-06", applied: 8 },
      ],
    })
  ),

  // DASH-02·03 — 단계별 전환율(퍼널)
  http.get("*/api/dashboard/stage-conversions", () =>
    ok({
      stages: [
        { stage: "APPLIED", count: 30 },
        { stage: "DOCUMENT", count: 30, passed: 18, passRate: 60.0 },
        { stage: "CODING_TEST", count: 18, passed: 10, passRate: 55.6 },
        { stage: "INTERVIEW", count: 10, passed: 6, passRate: 60.0 },
        { stage: "FINAL", count: 6, passed: 1, passRate: 16.7 },
      ],
      note: "결과가 확정된 지원만 분모에 포함",
    })
  ),

  // DASH-04 — 기술 스택 추세 (§4.7) — 사람인 크롤링 집계
  http.get("*/api/market/stack-trends", () => ok(market.stackTrends)),

  // DASH-05 — 지역별 분포 — 사람인 크롤링 집계
  http.get("*/api/market/region-distribution", () => ok(market.regionDistribution)),

  // DASH-06 — 개인 vs 시장 기술 스택 비교 (marketRatio만 크롤링 실데이터)
  http.get("*/api/market/user-comparison", () => ok(market.userComparison)),
];
