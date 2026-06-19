import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRetrospectives,
  createRetrospective,
  updateRetrospective,
  deleteRetrospective,
} from "./api";

// PROC-04 — 회고 목록
export function useRetrospectives(applicationId) {
  return useQuery({
    queryKey: ["retrospectives", applicationId],
    queryFn: () => getRetrospectives(applicationId),
    enabled: !!applicationId,
  });
}

// PROC-03 — 회고 작성
export function useCreateRetrospective(applicationId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => createRetrospective(applicationId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["retrospectives", applicationId] }),
  });
}

// PROC-03 — 회고 수정
export function useUpdateRetrospective(applicationId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ retroId, ...body }) => updateRetrospective(retroId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["retrospectives", applicationId] }),
  });
}

// PROC-03 — 회고 삭제
export function useDeleteRetrospective(applicationId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRetrospective,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["retrospectives", applicationId] }),
  });
}
