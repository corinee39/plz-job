import { http, HttpResponse } from "msw";
import { ok } from "../helpers.js";

// AI 생성 이력 저장소
const mockAiGenerations = [];

export const aiHandlers = [
  // AI-01 — Ollama 상태 확인
  http.get("/api/ai/health", () =>
    ok({ ollama: "UP", model: "gemma3:4b" })
  ),

  // AI-02·03·04·06 — 예상 면접질문 생성
  http.post("/api/ai/applications/:applicationId/interview-questions", async ({ params, request }) => {
    const body = await request.json();
    const { documentVersionId } = body;

    if (!documentVersionId) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "VALIDATION_FAILED", message: "문서 버전을 선택해 주세요." } },
        { status: 422 }
      );
    }

    const appId = Number(params.applicationId);
    const genId = Date.now();
    mockAiGenerations.push({
      generationId: genId,
      type: "INTERVIEW_QUESTIONS",
      applicationId: appId,
      createdAt: new Date().toISOString(),
    });

    return ok({
      generationId: genId,
      summary: "공고의 Java/Spring Boot 요구사항과 이력서의 백엔드 프로젝트 경험을 연결한 질문 세트입니다.",
      questions: [
        {
          category: "TECHNICAL",
          question: "Spring Boot에서 트랜잭션 관리를 어떻게 구성하셨나요?",
          reason: "공고에서 Spring Boot 실무 경험을 요구합니다.",
          followUps: [
            "@Transactional 전파 수준(propagation)을 바꿔본 경험이 있나요?",
            "분산 트랜잭션 상황을 처리한 방법은 무엇인가요?",
          ],
        },
        {
          category: "TECHNICAL",
          question: "Oracle DB에서 인덱스를 직접 설계하거나 튜닝한 경험이 있나요?",
          reason: "공고의 Oracle 요구사항과 이력서의 DB 프로젝트를 연결했습니다.",
          followUps: [
            "복합 인덱스를 사용한 이유를 설명해 주세요.",
            "실행 계획(EXPLAIN PLAN)을 분석해 본 경험이 있나요?",
          ],
        },
        {
          category: "PROJECT",
          question: "이력서에 나온 프로젝트에서 가장 어려웠던 기술적 도전은 무엇인가요?",
          reason: "지원 서류의 프로젝트 내용을 기반으로 생성했습니다.",
          followUps: [
            "그 문제를 어떻게 해결했고, 다시 한다면 다르게 접근할 점이 있나요?",
          ],
        },
        {
          category: "PROBLEM_SOLVING",
          question: "운영 중 예상치 못한 버그를 발견했을 때 어떻게 디버깅하고 수정했나요?",
          reason: "백엔드 실무 대응 역량을 확인하는 질문입니다.",
          followUps: [
            "재발 방지를 위해 어떤 조치를 취했나요?",
          ],
        },
        {
          category: "PERSONALITY",
          question: "팀원과 기술적 의견 충돌이 있었을 때 어떻게 해결하셨나요?",
          reason: "협업 환경에서의 소통 방식을 확인합니다.",
          followUps: [
            "결과적으로 어떤 결정을 내렸고, 배운 점이 있다면 무엇인가요?",
          ],
        },
      ],
      disclaimer: "AI가 생성한 연습용 질문이며 실제 면접 질문을 보장하지 않습니다.",
    });
  }),

  // AI-09 — 생성 이력 조회
  http.get("/api/ai/generations", ({ request }) => {
    const url = new URL(request.url);
    const applicationId = url.searchParams.get("applicationId");
    const type = url.searchParams.get("type");

    let result = [...mockAiGenerations];
    if (applicationId) result = result.filter((g) => String(g.applicationId) === applicationId);
    if (type) result = result.filter((g) => g.type === type);
    return ok(result);
  }),
];
