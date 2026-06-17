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

// 명세서 §4.1 GET /users/me 응답 필드 그대로 사용 (desiredPosition·desiredRegion)
let mockUser = {
  userId: 1,
  nickname: "개발자지망생",
  email: "test@example.com",
  provider: "KAKAO",
  desiredPosition: "백엔드",
  desiredRegion: "서울",
  techStacks: ["Java", "Spring Boot", "React"],
};

// 단계 이력 저장소 (applicationId → history[])
const mockHistories = {};

// 일정 저장소
const mockSchedules = [
  {
    scheduleId: 1,
    applicationId: 1001,
    jobPostingId: 1,
    companyName: "테크노바",
    jobTitle: "백엔드 개발자",
    scheduleType: "INTERVIEW",
    scheduledAt: "2026-06-25T14:00:00",
    location: "서울 강남구 테헤란로 123",
    notes: "포트폴리오 준비 필요",
  },
  {
    scheduleId: 2,
    applicationId: 2002,
    jobPostingId: 2,
    companyName: "데이터웍스",
    jobTitle: "프론트엔드 개발자",
    scheduleType: "CODING_TEST",
    scheduledAt: "2026-06-20T10:00:00",
    location: null,
    notes: "온라인 코딩테스트",
  },
];

// 회고 저장소 (applicationId → retrospective[])
const mockRetros = {};

// 문서 저장소 — 각 문서는 versions[]를 가진다 (DOC-01~05)
const mockDocuments = [
  {
    documentId: 3001,
    documentType: "RESUME",
    title: "백엔드 이력서",
    versions: [
      {
        versionId: 3101,
        versionName: "v1",
        description: "초안",
        fileName: "resume_v1.pdf",
        mimeType: "application/pdf",
        sizeBytes: 182000,
        hasExtractedText: true,
        createdAt: "2026-06-10T11:00:00+09:00",
      },
    ],
  },
];
let mockDocSeq = 3002;
let mockVersionSeq = 3102;

// 공고(지원)에 연결된 제출 문서 (applicationId → [{ versionId, documentTitle, versionName }])
const mockSubmittedDocs = {};

// versionId로 문서/버전 메타를 찾는 헬퍼
function findVersion(versionId) {
  for (const doc of mockDocuments) {
    const version = doc.versions.find((v) => v.versionId === versionId);
    if (version) return { doc, version };
  }
  return null;
}

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

  // 프로필 수정 (AUTH-05) — PUT /users/me/profile
  http.put("/api/users/me/profile", async ({ request }) => {
    const body = await request.json();
    if (!body.nickname || !body.nickname.trim()) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "VALIDATION_FAILED", message: "닉네임은 필수입니다." } },
        { status: 422 }
      );
    }
    mockUser = {
      ...mockUser,
      nickname: body.nickname,
      desiredPosition: body.desiredPosition ?? null,
      desiredRegion: body.desiredRegion ?? null,
      techStacks: Array.isArray(body.techStacks) ? body.techStacks : [],
    };
    return ok(mockUser);
  }),

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
    const appId = job.jobPostingId + 1000;
    return ok({
      ...job,
      applicationId: appId,
      currentStage: job.stage,
      finalResult: "IN_PROGRESS",
      techStacks: job.techStacks ?? ["Java", "Spring Boot"],
      description: job.description ?? null,
      startDate: job.startDate ?? null,
      submittedDocuments: mockSubmittedDocs[appId] ?? [],
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
      upcomingSchedules: 2,
      finalPassCount: 0,
    })
  ),

  // ── 서류(문서·버전) ───────────────────────────────────────────────────

  // 문서 목록 — 각 문서의 최신 버전 요약 (DOC-01)
  http.get("/api/documents", () =>
    ok(
      mockDocuments.map((d) => ({
        documentId: d.documentId,
        documentType: d.documentType,
        title: d.title,
        versionCount: d.versions.length,
        latestVersionName: d.versions.at(-1)?.versionName ?? null,
        updatedAt: d.versions.at(-1)?.createdAt ?? null,
      }))
    )
  ),

  // 문서 상세 — 버전 목록 포함 (DOC-02·03)
  http.get("/api/documents/:documentId", ({ params }) => {
    const doc = mockDocuments.find((d) => d.documentId === Number(params.documentId));
    if (!doc) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "DOCUMENT_NOT_FOUND", message: "문서를 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    return ok(doc);
  }),

  // 문서(논리 단위) 생성 (DOC-01·02)
  http.post("/api/documents", async ({ request }) => {
    const body = await request.json();
    if (!body.documentType || !body.title) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "VALIDATION_FAILED", message: "문서 유형과 제목은 필수입니다." } },
        { status: 422 }
      );
    }
    const newDoc = {
      documentId: mockDocSeq++,
      documentType: body.documentType,
      title: body.title,
      versions: [],
    };
    mockDocuments.push(newDoc);
    return HttpResponse.json(
      {
        success: true,
        data: { documentId: newDoc.documentId, documentType: newDoc.documentType, title: newDoc.title },
        error: null,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // 버전 업로드 — multipart/form-data, PDF/TXT·10MB 검증 (DOC-01·02·05·06)
  http.post("/api/documents/:documentId/versions", async ({ params, request }) => {
    const doc = mockDocuments.find((d) => d.documentId === Number(params.documentId));
    if (!doc) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "DOCUMENT_NOT_FOUND", message: "문서를 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    const form = await request.formData();
    const file = form.get("file");
    const versionName = form.get("versionName");
    const description = form.get("description");

    const ALLOWED = ["application/pdf", "text/plain"];
    if (!file || !ALLOWED.includes(file.type)) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "UNSUPPORTED_FILE_TYPE", message: "PDF 또는 TXT 파일만 업로드할 수 있습니다." } },
        { status: 400 }
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "FILE_TOO_LARGE", message: "파일은 최대 10MB까지 업로드할 수 있습니다." } },
        { status: 413 }
      );
    }

    // 빈 파일이면 텍스트 추출 실패로 시뮬레이션 (extractStatus 분기 확인용)
    const extractStatus = file.size > 0 ? "SUCCESS" : "FAILED";
    const newVersion = {
      versionId: mockVersionSeq++,
      versionName: versionName || `v${doc.versions.length + 1}`,
      description: description || null,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      hasExtractedText: extractStatus === "SUCCESS",
      createdAt: new Date().toISOString(),
    };
    doc.versions.push(newVersion);
    return HttpResponse.json(
      {
        success: true,
        data: {
          versionId: newVersion.versionId,
          versionName: newVersion.versionName,
          fileName: newVersion.fileName,
          mimeType: newVersion.mimeType,
          sizeBytes: newVersion.sizeBytes,
          extractStatus,
          extractedTextLength: extractStatus === "SUCCESS" ? Math.floor(file.size / 4) : 0,
        },
        error: null,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // 버전 다운로드 — 파일 스트림(blob) (DOC-04)
  http.get("/api/document-versions/:versionId/download", ({ params }) => {
    const found = findVersion(Number(params.versionId));
    if (!found) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "DOCUMENT_NOT_FOUND", message: "문서를 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    const { version } = found;
    const content = `[Plz-Job mock 파일]\n파일명: ${version.fileName}\n버전: ${version.versionName}\n생성: ${version.createdAt}`;
    return new HttpResponse(content, {
      status: 200,
      headers: {
        "Content-Type": version.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${version.fileName}"`,
      },
    });
  }),

  // 버전 삭제 (DOC-04)
  http.delete("/api/document-versions/:versionId", ({ params }) => {
    const found = findVersion(Number(params.versionId));
    if (found) {
      found.doc.versions = found.doc.versions.filter(
        (v) => v.versionId !== Number(params.versionId)
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // 공고(지원)에 제출 문서 버전 연결 (DOC-03)
  http.post("/api/applications/:applicationId/documents/:versionId", ({ params }) => {
    const appId = Number(params.applicationId);
    const found = findVersion(Number(params.versionId));
    if (!found) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "DOCUMENT_NOT_FOUND", message: "문서를 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    if (!mockSubmittedDocs[appId]) mockSubmittedDocs[appId] = [];
    if (!mockSubmittedDocs[appId].some((d) => d.versionId === found.version.versionId)) {
      mockSubmittedDocs[appId].push({
        versionId: found.version.versionId,
        documentTitle: found.doc.title,
        versionName: found.version.versionName,
      });
    }
    return HttpResponse.json(
      {
        success: true,
        data: { applicationId: appId, versionId: found.version.versionId },
        error: null,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // ── 일정 ──────────────────────────────────────────────────────────────

  http.get("/api/schedules", ({ request }) => {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const appId = url.searchParams.get("applicationId");

    let result = [...mockSchedules];
    if (appId) result = result.filter((s) => String(s.applicationId) === appId);
    if (from) result = result.filter((s) => s.scheduledAt >= from);
    if (to) result = result.filter((s) => s.scheduledAt <= to);
    result.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    return ok(result);
  }),

  http.post("/api/applications/:applicationId/schedules", async ({ params, request }) => {
    const body = await request.json();
    const appId = Number(params.applicationId);
    const job = mockJobPostings.find((j) => j.jobPostingId + 1000 === appId);
    const newSchedule = {
      scheduleId: Date.now(),
      applicationId: appId,
      jobPostingId: job?.jobPostingId ?? null,
      companyName: job?.companyName ?? "",
      jobTitle: job?.title ?? "",
      scheduleType: body.scheduleType,
      scheduledAt: body.scheduledAt,
      location: body.location ?? null,
      notes: body.notes ?? null,
    };
    mockSchedules.push(newSchedule);
    return HttpResponse.json(
      { success: true, data: newSchedule, error: null, timestamp: new Date().toISOString() },
      { status: 201 }
    );
  }),

  http.put("/api/schedules/:scheduleId", async ({ params, request }) => {
    const body = await request.json();
    const idx = mockSchedules.findIndex((s) => s.scheduleId === Number(params.scheduleId));
    if (idx === -1)
      return HttpResponse.json(
        { success: false, data: null, error: { code: "NOT_FOUND", message: "일정을 찾을 수 없습니다." } },
        { status: 404 }
      );
    mockSchedules[idx] = { ...mockSchedules[idx], ...body };
    return ok(mockSchedules[idx]);
  }),

  http.delete("/api/schedules/:scheduleId", ({ params }) => {
    const idx = mockSchedules.findIndex((s) => s.scheduleId === Number(params.scheduleId));
    if (idx !== -1) mockSchedules.splice(idx, 1);
    return ok(null);
  }),

  // ── 회고 ──────────────────────────────────────────────────────────────

  http.get("/api/applications/:applicationId/retrospectives", ({ params }) => {
    const appId = Number(params.applicationId);
    return ok(mockRetros[appId] ?? []);
  }),

  http.post("/api/applications/:applicationId/retrospectives", async ({ params, request }) => {
    const body = await request.json();
    const appId = Number(params.applicationId);
    if (!mockRetros[appId]) mockRetros[appId] = [];
    const newRetro = {
      retrospectiveId: Date.now(),
      applicationId: appId,
      retrospectiveType: body.retrospectiveType,
      difficulty: body.difficulty,
      content: body.content,
      improvements: body.improvements ?? null,
      createdAt: new Date().toISOString(),
    };
    mockRetros[appId].push(newRetro);
    return HttpResponse.json(
      { success: true, data: newRetro, error: null, timestamp: new Date().toISOString() },
      { status: 201 }
    );
  }),

  http.put("/api/retrospectives/:retrospectiveId", async ({ params, request }) => {
    const body = await request.json();
    const retroId = Number(params.retrospectiveId);
    for (const appId of Object.keys(mockRetros)) {
      const idx = mockRetros[appId].findIndex((r) => r.retrospectiveId === retroId);
      if (idx !== -1) {
        mockRetros[appId][idx] = { ...mockRetros[appId][idx], ...body };
        return ok(mockRetros[appId][idx]);
      }
    }
    return HttpResponse.json(
      { success: false, data: null, error: { code: "NOT_FOUND", message: "회고를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }),

  http.delete("/api/retrospectives/:retrospectiveId", ({ params }) => {
    const retroId = Number(params.retrospectiveId);
    for (const appId of Object.keys(mockRetros)) {
      const idx = mockRetros[appId].findIndex((r) => r.retrospectiveId === retroId);
      if (idx !== -1) {
        mockRetros[appId].splice(idx, 1);
        return ok(null);
      }
    }
    return ok(null);
  }),
];
