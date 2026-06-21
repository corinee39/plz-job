import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getDashboardSummary,
  getMonthlyApplications,
  getStageConversions,
  getStackTrends,
  getUserComparison,
  getRegionDistribution,
  postDashboardReport,
} from "./api";
import { useFilterStore } from "../../store/filterStore";

// filterStore의 period → API from/to 날짜 변환
function periodToRange(period) {
  const to = new Date();
  const from = new Date();
  if (period === "1m") from.setMonth(from.getMonth() - 1);
  else if (period === "3m") from.setMonth(from.getMonth() - 3);
  else if (period === "6m") from.setMonth(from.getMonth() - 6);
  else from.setFullYear(from.getFullYear() - 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function useFilterParams() {
  const { period, job, region } = useFilterStore();
  const { from, to } = periodToRange(period);
  return { from, to, position: job || undefined, region: region || undefined };
}

export function useDashboardSummary() {
  const params = useFilterParams();
  return useQuery({ queryKey: ["dashboard", "summary", params], queryFn: () => getDashboardSummary(params) });
}

export function useMonthlyApplications() {
  const params = useFilterParams();
  return useQuery({ queryKey: ["dashboard", "monthly", params], queryFn: () => getMonthlyApplications(params) });
}

export function useStageConversions() {
  const params = useFilterParams();
  return useQuery({ queryKey: ["dashboard", "stages", params], queryFn: () => getStageConversions(params) });
}

// DASH-04 — 기술 스택 추세 (시장 전체)
export function useStackTrends() {
  const params = useFilterParams();
  return useQuery({ queryKey: ["dashboard", "stackTrends", params], queryFn: () => getStackTrends(params) });
}

export function useUserComparison() {
  const params = useFilterParams();
  return useQuery({ queryKey: ["dashboard", "comparison", params], queryFn: () => getUserComparison(params) });
}

export function useRegionDistribution() {
  const params = useFilterParams();
  return useQuery({ queryKey: ["dashboard", "regions", params], queryFn: () => getRegionDistribution(params) });
}

// AI-05 — mutation: 사용자가 "AI 분석하기" 클릭 시 호출
export function useDashboardReport() {
  return useMutation({ mutationFn: postDashboardReport });
}
