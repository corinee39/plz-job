import { http, HttpResponse } from "msw";

// 백엔드 완성 전까지만 사용하는 임시 mock. §11 공통 응답 형식을 그대로 흉내낸다.
function ok(data) {
  return HttpResponse.json({
    success: true,
    data,
    error: null,
    timestamp: new Date().toISOString(),
  });
}

const mockUser = {
  userId: 1,
  nickname: "개발자지망생",
  email: "test@example.com",
  preferredJob: "백엔드",
  preferredRegion: "서울",
  techStacks: ["Java", "Spring Boot", "React"],
};

// 단계 이력 저장소 (applicationId → history[])
const mockHistories = {};

const mockJobPostings = [
  {
    jobPostingId: 1,
    companyName: "테크노바",
    title: "백엔드 개발자",
    region: "서울",
    position: "백엔드",
    deadline: "2026-07-01",
    url: "https://example.com/job/1",
    stage: "APPLIED",
  },
  {
    jobPostingId: 2,
    companyName: "데이터웍스",
    title: "프론트엔드 개발자",
    region: "경기",
    position: "프론트엔드",
    deadline: "2026-06-30",
    url: "https://example.com/job/2",
    stage: "DOCUMENT_PASS",
  },
];

export const handlers = [
  // OAuth: 소셜 로그인 시작 (카카오/구글)
  http.get("/api/auth/oauth2/:provider", ({ params }) => {
    const { provider } = params;
    const mockAuthUrl =
      provider === "kakao"
        ? "https://kauth.kakao.com/oauth/authorize?client_id=mock&redirect_uri=http://localhost:5173/auth/callback"
        : "https://accounts.google.com/o/oauth2/v2/auth?client_id=mock&redirect_uri=http://localhost:5173/auth/callback";
    return ok({ provider, authorizationUrl: mockAuthUrl });
  }),

  // OAuth: 콜백 처리 (쿠키 설정 + 사용자 정보 반환)
  http.get("/api/auth/oauth2/:provider/callback", ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code") || "mock_code";

    if (!code) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "INVALID_CODE", message: "Invalid authorization code" } },
        { status: 400 }
      );
    }

    return new HttpResponse(
      JSON.stringify(
        ok({
          user: mockUser,
          isNewUser: false,
        })
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": [
            "access_token=mock_access_token; Path=/; HttpOnly; SameSite=Lax",
            "refresh_token=mock_refresh_token; Path=/; HttpOnly; SameSite=Lax",
          ].join(", "),
        },
      }
    );
  }),

  // 현재 사용자 조회
  http.get("/api/users/me", () => ok(mockUser)),

  // 로그아웃
  http.post("/api/auth/logout", () =>
    new HttpResponse(JSON.stringify(ok(null)), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": [
          "access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
          "refresh_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        ].join(", "),
      },
    })
  ),

  // 공고·지원
  http.get("/api/job-postings", () =>
    ok({ content: mockJobPostings, totalElements: 2, totalPages: 1, page: 0 })
  ),

  // 공고 자동 입력 미리보기 (JOB-01, CRAWL-01~06)
  http.post("/api/job-postings/preview", async ({ request }) => {
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
  http.post("/api/job-postings", async ({ request }) => {
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
      stage: body.initialStage ?? "INTERESTED",
    });

    return HttpResponse.json(
      { success: true, data: { jobPostingId: newId, applicationId: newId + 1000 }, error: null, timestamp: new Date().toISOString() },
      { status: 201 }
    );
  }),

  // 공고 상세 (JOB-06)
  http.get("/api/job-postings/:id", ({ params }) => {
    const job = mockJobPostings.find((j) => j.jobPostingId === Number(params.id));
    if (!job) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "JOB_NOT_FOUND", message: "공고를 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    return ok({
      ...job,
      applicationId: job.jobPostingId + 1000,
      currentStage: job.stage,
      finalResult: "IN_PROGRESS",
      techStacks: job.techStacks ?? ["Java", "Spring Boot"],
      description: job.description ?? null,
      startDate: job.startDate ?? null,
    });
  }),

  // 공고 단계 변경 (JOB-07) — PUT /applications/:applicationId/stage
  http.put("/api/applications/:applicationId/stage", async ({ params, request }) => {
    const body = await request.json();
    const appId = Number(params.applicationId);
    const job = mockJobPostings.find((j) => j.jobPostingId + 1000 === appId);
    const prevStage = job?.stage ?? null;
    if (job) job.stage = body.toStage;

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

  // 단계 이력 조회 — GET /applications/:applicationId/stage-histories
  http.get("/api/applications/:applicationId/stage-histories", ({ params }) => {
    const appId = Number(params.applicationId);
    const job = mockJobPostings.find((j) => j.jobPostingId + 1000 === appId);
    const histories = mockHistories[appId] ?? [];
    if (job && histories.length === 0) {
      // 초기 상태 이력 자동 생성
      histories.push({
        historyId: 1,
        fromStage: null,
        toStage: job.stage ?? "INTERESTED",
        memo: null,
        changedAt: new Date(Date.now() - 86400000).toISOString(),
      });
      mockHistories[appId] = histories;
    }
    return ok(histories);
  }),

  // 대시보드
  http.get("/api/dashboard/summary", () =>
    ok({
      monthlyApplications: 2,
      inProgress: 1,
      upcomingSchedules: 0,
      finalPassCount: 0,
    })
  ),
];
