import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from "./api";

// PROC-02·05 — 일정 목록 (캘린더)
export function useSchedules(params) {
  return useQuery({
    queryKey: ["schedules", params],
    queryFn: () => getSchedules(params),
  });
}

// PROC-01 — 일정 등록
export function useCreateSchedule(applicationId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => createSchedule(applicationId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
}

// PROC-01 — 일정 수정
export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, ...body }) => updateSchedule(scheduleId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
}

// PROC-01 — 일정 삭제
export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
}
