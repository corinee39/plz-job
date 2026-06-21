import { http } from "msw";
import { ok } from "../helpers.js";
import { mockJobPostings } from "../state.js";
// 시장 데이터(DASH-04/05/06)는 etl/run.py 크롤링·집계 산출물에서 생성된다.
import market from "../data/market.json";

// DASH-01·02·03: 단계 진행 깊이. 높을수록 더 많은 전형을 통과한 것.
const STAGE_RANK = {
  INTERESTED: 0, PLANNED: 0,
  APPLIED: 1,
  DOCUMENT_PASS: 2, DOCUMENT_FAIL: 2,
  CODING_TEST: 3, CODING_FAIL: 3, CODING_PASS: 4,
  INTERVIEW: 5, INTERVIEW_FAIL: 5, INTERVIEW_PASS: 6,
  FINAL_PASS: 7,
  WITHDRAWN: -1,
};

function stageRank(stage) {
  return STAGE_RANK[stage] ?? 0;
}

// period 파라미터(from/to·position·region)로 내 지원 목록 필터링
function filterMyApplications(request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const position = searchParams.get("position");
  const region = searchParams.get("region");

  return mockJobPostings.filter((j) => {
    if (!j.appliedAt) return false;
    if (from && j.appliedAt < from) return false;
    if (to && j.appliedAt > to) return false;
    if (position && j.position !== position) return false;
    if (region && j.region !== region) return false;
    return true;
  });
}

export const dashboardHandlers = [
  // DASH-03, ETL-10 — KPI 요약 (정적 — 실서버 통합 전까지 유지)
  http.get("*/api/dashboard/summary", () =>
    ok({
      thisMonthApplications: 8,
      inProgressCount: 6,
      upcomingSchedules: 3,
      finalPassCount: 1,
      applicationsDelta: -2,
      inProgressDelta: 1,
      upcomingDelta: 0,
      finalPassDelta: 1,
      overallPassRate: 12.5,
      sampleSize: 30,
      dataBaseDate: "2026-06-16",
    })
  ),

  // DASH-01 — 월별 지원 추이: 내 지원 데이터에서 동적 집계
  http.get("*/api/dashboard/monthly-applications", ({ request }) => {
    const jobs = filterMyApplications(request);

    const monthMap = {};
    jobs.forEach((j) => {
      const month = j.appliedAt.slice(0, 7); // "YYYY-MM"
      monthMap[month] = (monthMap[month] ?? 0) + 1;
    });

    const monthly = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, applied]) => ({ month, applied }));

    return ok({ monthly });
  }),

  // DASH-02·03 — 단계별 전환율(퍼널): 내 지원 데이터에서 동적 집계
  http.get("*/api/dashboard/stage-conversions", ({ request }) => {
    const jobs = filterMyApplications(request);

    // 각 퍼널 마일스톤에 도달한 지원 수 카운트
    const c = { applied: 0, document: 0, coding: 0, interview: 0, final: 0 };
    jobs.forEach((j) => {
      const r = stageRank(j.currentStage ?? "INTERESTED");
      if (r >= 1) c.applied++;
      if (r >= 2) c.document++;
      if (r >= 3) c.coding++;
      if (r >= 5) c.interview++;
      if (r >= 7) c.final++;
    });

    const pct = (num, den) =>
      den > 0 ? Math.round((num / den) * 1000) / 10 : 0;

    const stages = [
      { stage: "APPLIED", count: c.applied },
      {
        stage: "DOCUMENT",
        count: c.document,
        passed: c.coding,
        passRate: pct(c.coding, c.document),
      },
      {
        stage: "CODING_TEST",
        count: c.coding,
        passed: c.interview,
        passRate: pct(c.interview, c.coding),
      },
      {
        stage: "INTERVIEW",
        count: c.interview,
        passed: c.final,
        passRate: pct(c.final, c.interview),
      },
      { stage: "FINAL", count: c.final },
    ];

    return ok({ stages, note: "현재 단계 기준 집계 (진행 중 포함)" });
  }),

  // DASH-04 — 기술 스택 추세 (§4.7) — 사람인 크롤링 집계
  http.get("*/api/market/stack-trends", () => ok(market.stackTrends)),

  // DASH-05 — 지역별 분포 — 사람인 크롤링 집계
  http.get("*/api/market/region-distribution", () => ok(market.regionDistribution)),

  // DASH-06 — 개인 vs 시장 기술 스택 비교 (marketRatio만 크롤링 실데이터)
  http.get("*/api/market/user-comparison", () => ok(market.userComparison)),
];
