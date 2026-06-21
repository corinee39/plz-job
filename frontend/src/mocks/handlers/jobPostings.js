import { http, HttpResponse } from "msw";
import { ok } from "../helpers.js";
import { mockJobPostings, mockSubmittedDocs } from "../state.js";

// 단계 이력 저장소 (applicationId → history[])
const mockHistories = {};

export const jobHandlers = [
  // 공고 목록 (JOB-05) — API 명세서 §4.2: currentStage / applicationId 포함
  http.get("*/api/job-postings", () =>
    ok({
      content: mockJobPostings.map((j) => ({
        jobPostingId: j.jobPostingId,
        applicationId: j.jobPostingId + 1000,
        companyName: j.companyName,
        title: j.title,
        position: j.position ?? null,
        region: j.region ?? null,
        deadline: j.deadline ?? null,
        currentStage: j.currentStage,
        finalResult: "IN_PROGRESS",
        favorite: false,
      })),
      totalElements: mockJobPostings.length,
      totalPages: 1,
      page: 0,
      size: 20,
    })
  ),

  // 공고 자동 입력 미리보기 (JOB-01, CRAWL-01~06)
  http.post("*/api/job-postings/preview", async ({ request }) => {
    const { url } = await request.json();

    if (!url || url.includes("localhost") || url.startsWith("file:")) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "URL_NOT_ALLOWED", message: "허용되지 않는 URL입니다. (사설 IP·localhost·file 스킴 차단)" } },
        { status: 400 }
      );
    }

    return ok({
      sourceUrl: url,
      extracted: {
        companyName: "테크노바",
        title: "백엔드 개발자 (경력 2년 이상)",
        position: "백엔드",
        region: "서울 강남구",
        startDate: "2026-06-01",
        deadline: "2026-07-15",
        techStacks: ["Java", "Spring Boot", "Oracle"],
      },
      extractStatus: "PARTIAL",
      missingFields: ["startDate"],
    });
  }),

  // 공고 등록 (JOB-02·03·04·09)
  http.post("*/api/job-postings", async ({ request }) => {
    const body = await request.json();

    if (!body.companyName || !body.title) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "VALIDATION_FAILED", message: "회사명과 공고명은 필수입니다." } },
        { status: 422 }
      );
    }

    // 중복 URL 시뮬레이션: 이미 등록된 URL이고 confirmDuplicate가 없으면 409
    const isDuplicate = body.url && body.url === mockJobPostings[0].url && !body.confirmDuplicate;
    if (isDuplicate) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "DUPLICATE_JOB_URL", message: "이미 등록된 공고 URL입니다." } },
        { status: 409 }
      );
    }

    const newId = Date.now();
    mockJobPostings.push({
      jobPostingId: newId,
      companyName: body.companyName,
      title: body.title,
      region: body.region ?? null,
      position: body.position ?? null,
      deadline: body.deadline ?? null,
      url: body.url ?? null,
      currentStage: body.initialStage ?? "INTERESTED",
    });

    return HttpResponse.json(
      { success: true, data: { jobPostingId: newId, applicationId: newId + 1000 }, error: null, timestamp: new Date().toISOString() },
      { status: 201 }
    );
  }),

  // 공고 상세 (JOB-06)
  http.get("*/api/job-postings/:id", ({ params }) => {
    const job = mockJobPostings.find((j) => j.jobPostingId === Number(params.id));
    if (!job) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "JOB_NOT_FOUND", message: "공고를 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    const appId = job.jobPostingId + 1000;
    return ok({
      ...job,
      applicationId: appId,
      finalResult: "IN_PROGRESS",
      techStacks: job.techStacks ?? ["Java", "Spring Boot"],
      description: job.description ?? null,
      startDate: job.startDate ?? null,
      submittedDocuments: mockSubmittedDocs[appId] ?? [],
    });
  }),

  // 공고 단계 변경 (JOB-07) — PUT /applications/:applicationId/stage
  http.put("*/api/applications/:applicationId/stage", async ({ params, request }) => {
    const body = await request.json();
    const appId = Number(params.applicationId);
    const job = mockJobPostings.find((j) => j.jobPostingId + 1000 === appId);
    const prevStage = job?.currentStage ?? null;
    if (job) job.currentStage = body.toStage;

    if (!mockHistories[appId]) mockHistories[appId] = [];
    mockHistories[appId].push({
      historyId: Date.now(),
      fromStage: prevStage,
      toStage: body.toStage,
      memo: body.memo ?? null,
      changedAt: new Date().toISOString(),
    });

    return ok({ applicationId: appId, currentStage: body.toStage });
  }),

  // 공고 수정 (JOB-06) — deadline 등 필드 부분 업데이트
  http.put("*/api/job-postings/:id", async ({ params, request }) => {
    const job = mockJobPostings.find((j) => j.jobPostingId === Number(params.id));
    if (!job) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "JOB_NOT_FOUND", message: "공고를 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    const body = await request.json();
    const updatable = ["companyName", "title", "deadline", "region", "position", "techStacks", "description", "startDate"];
    updatable.forEach((k) => { if (k in body) job[k] = body[k]; });
    return ok({ ...job, applicationId: job.jobPostingId + 1000 });
  }),

  // 공고 삭제 (JOB-06)
  http.delete("*/api/job-postings/:id", ({ params }) => {
    const idx = mockJobPostings.findIndex((j) => j.jobPostingId === Number(params.id));
    if (idx !== -1) mockJobPostings.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // 단계 이력 조회
  http.get("*/api/applications/:applicationId/stage-histories", ({ params }) => {
    const appId = Number(params.applicationId);
    const job = mockJobPostings.find((j) => j.jobPostingId + 1000 === appId);
    const histories = mockHistories[appId] ?? [];
    if (job && histories.length === 0) {
      histories.push({
        historyId: 1,
        fromStage: null,
        toStage: job.currentStage ?? "INTERESTED",
        memo: null,
        changedAt: new Date(Date.now() - 86400000).toISOString(),
      });
      mockHistories[appId] = histories;
    }
    return ok(histories);
  }),
];
