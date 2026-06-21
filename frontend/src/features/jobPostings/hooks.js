import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  previewJobPosting,
  createJobPosting,
  getJobPostings,
  getJobPosting,
  updateJobPosting,
  deleteJobPosting,
  changeStage,
  getStageHistories,
} from "./api";

// JOB-05 — 공고 목록
export function useJobPostings(params) {
  return useQuery({
    queryKey: ["jobPostings", params],
    queryFn: () => getJobPostings(params),
  });
}

// JOB-06 — 공고 상세
export function useJobPosting(id) {
  return useQuery({
    queryKey: ["jobPosting", id],
    queryFn: () => getJobPosting(id),
    enabled: !!id,
  });
}

// JOB-07 — 단계 변경 이력
export function useStageHistories(applicationId) {
  return useQuery({
    queryKey: ["stageHistories", applicationId],
    queryFn: () => getStageHistories(applicationId),
    enabled: !!applicationId,
  });
}

// JOB-01, CRAWL-01~06 — 공고 URL 자동 미리보기
export function usePreviewJobPosting() {
  return useMutation({ mutationFn: previewJobPosting });
}

// JOB-02·03·04·09 — 공고 등록
export function useCreateJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createJobPosting,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobPostings"] });
      // JOB-07·DASH-01~03: 지원 기록 변동 → 대시보드 집계 재요청
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// JOB-06 — 공고 수정
export function useUpdateJobPosting(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => updateJobPosting(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobPosting", id] });
      qc.invalidateQueries({ queryKey: ["jobPostings"] });
      // 직무·지역 수정이 대시보드 필터 집계에 영향 → 무효화
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// JOB-06 — 공고 삭제
export function useDeleteJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteJobPosting,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobPostings"] });
      // 공고 삭제 → 집계 모수 변동 → 대시보드 무효화
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// JOB-07 — 지원 단계 변경
export function useChangeStage(jobPostingId, applicationId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => changeStage(applicationId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobPosting", jobPostingId] });
      qc.invalidateQueries({ queryKey: ["stageHistories", applicationId] });
      qc.invalidateQueries({ queryKey: ["jobPostings"] });
      // JOB-07: 단계 변경 → 퍼널·합격률 재계산 → 대시보드 무효화
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
