import { http } from "msw";
import { ok } from "../helpers.js";

export const dashboardHandlers = [
  // DASH-03, ETL-10 — KPI 요약
  http.get("*/api/dashboard/summary", () =>
    ok({
      thisMonthApplications: 8,
      inProgressCount: 6,
      upcomingSchedules: 3,
      finalPassCount: 1,
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

  // DASH-04 — 기술 스택 추세 (§4.7)
  http.get("*/api/market/stack-trends", () =>
    ok({
      dataBaseDate: "2026-06-16",
      trends: [
        { stack: "Java", postingCount: 1240, ratio: 22.0 },
        { stack: "Spring", postingCount: 1100, ratio: 19.5 },
        { stack: "React", postingCount: 980, ratio: 17.4 },
        { stack: "Python", postingCount: 870, ratio: 15.4 },
        { stack: "Kubernetes", postingCount: 640, ratio: 11.4 },
      ],
    })
  ),

  // DASH-05 — 지역별 분포
  http.get("*/api/market/region-distribution", () =>
    ok({
      dataBaseDate: "2026-06-16",
      regions: [
        { region: "서울", postingCount: 5200 },
        { region: "경기", postingCount: 2100 },
        { region: "부산", postingCount: 640 },
        { region: "대전", postingCount: 380 },
        { region: "인천", postingCount: 290 },
      ],
    })
  ),

  // DASH-06 — 개인 vs 시장 기술 스택 비교
  http.get("*/api/market/user-comparison", () =>
    ok({
      dataBaseDate: "2026-06-16",
      comparison: [
        { stack: "Java", userRatio: 40.0, marketRatio: 22.0, gap: 18.0 },
        { stack: "Spring", userRatio: 35.0, marketRatio: 19.5, gap: 15.5 },
        { stack: "React", userRatio: 20.0, marketRatio: 17.4, gap: 2.6 },
        { stack: "Python", userRatio: 10.0, marketRatio: 15.4, gap: -5.4 },
        { stack: "Kubernetes", userRatio: 5.0, marketRatio: 11.4, gap: -6.4 },
      ],
    })
  ),
];
