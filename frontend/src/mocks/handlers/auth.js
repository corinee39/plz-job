import { http, HttpResponse } from "msw";
import { ok } from "../helpers.js";

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

export const authHandlers = [
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
      JSON.stringify(ok({ user: mockUser, isNewUser: false })),
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
];
