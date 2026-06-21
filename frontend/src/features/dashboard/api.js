import { apiClient } from "../../lib/api/client";

// DASH-03, ETL-10 — KPI 요약
export function getDashboardSummary(params) {
  return apiClient.get("/dashboard/summary", { params });
}

// DASH-01 — 월별 지원 추이
export function getMonthlyApplications(params) {
  return apiClient.get("/dashboard/monthly-applications", { params });
}

// DASH-02·03 — 단계별 전환율
export function getStageConversions(params) {
  return apiClient.get("/dashboard/stage-conversions", { params });
}

// DASH-04 — 기술 스택 추세 (시장 전체)
export function getStackTrends(params) {
  return apiClient.get("/market/stack-trends", { params });
}

// DASH-06 — 개인 vs 시장 기술 스택 비교
export function getUserComparison(params) {
  return apiClient.get("/market/user-comparison", { params });
}

// DASH-05 — 지역별 채용 공고 수
export function getRegionDistribution(params) {
  return apiClient.get("/market/region-distribution", { params });
}

// AI-05 — 대시보드 집계 기반 자연어 리포트 생성 (LLM 응답 시간을 위해 타임아웃 120초)
export function postDashboardReport(body) {
  return apiClient.post("/ai/dashboard-report", body, { timeout: 120_000 });
}
