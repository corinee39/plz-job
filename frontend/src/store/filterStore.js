import { create } from "zustand";

// 대시보드·공고 목록 공통 필터 상태 (DASH-08, JOB-08)
export const useFilterStore = create((set) => ({
  period: "6m",   // "1m" | "3m" | "6m" | "1y"
  job: "",        // 직무 필터 (빈 문자열 = 전체)
  region: "",     // 지역 필터 (빈 문자열 = 전체)
  setPeriod: (period) => set({ period }),
  setJob: (job) => set({ job }),
  setRegion: (region) => set({ region }),
  reset: () => set({ period: "6m", job: "", region: "" }),
}));
