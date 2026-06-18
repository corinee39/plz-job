import { apiClient } from "../../lib/api/client";

// AI-02·03·04·06 — 공고 + 문서 버전 텍스트로 예상 면접 질문 생성
export async function generateInterviewQuestions(applicationId, { documentVersionId, regenerate = false }) {
  return apiClient.post(`/ai/applications/${applicationId}/interview-questions`, {
    documentVersionId,
    regenerate,
  });
}

// AI-09 — 생성 이력 조회 (type: INTERVIEW_QUESTIONS | DASHBOARD_REPORT)
export async function getGenerations({ applicationId, type } = {}) {
  return apiClient.get("/ai/generations", { params: { applicationId, type } });
}

// AI-01 — Ollama 상태 확인
export async function checkAiHealth() {
  return apiClient.get("/ai/health");
}
