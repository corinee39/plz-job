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
