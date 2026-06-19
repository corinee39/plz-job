import { useMutation, useQuery } from "@tanstack/react-query";
import { generateInterviewQuestions, getGenerations, checkAiHealth } from "./api";

// AI-01 — Ollama 상태 확인
export function useAiHealth() {
  return useQuery({
    queryKey: ["aiHealth"],
    queryFn: checkAiHealth,
    staleTime: 30 * 1000,
    retry: false,
  });
}

// AI-02·03·04·06 — 예상 면접질문 생성
export function useGenerateInterviewQuestions(applicationId) {
  return useMutation({
    mutationFn: (body) => generateInterviewQuestions(applicationId, body),
  });
}

// AI-09 — 생성 이력 조회
export function useGenerations(params) {
  return useQuery({
    queryKey: ["aiGenerations", params],
    queryFn: () => getGenerations(params),
    enabled: !!(params?.applicationId || params?.type),
  });
}
