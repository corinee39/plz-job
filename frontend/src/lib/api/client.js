import axios from "axios";

// 요구사항 명세서 §11 공통 응답 형식: { success, data, error, timestamp }
// 인증 토큰은 Secure·HttpOnly 쿠키 권장(§12.1)이므로 withCredentials를 기본 켠다.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 10_000,
  withCredentials: true,
});

// AUTH-03: 동시에 여러 요청이 401이 나도 /auth/reissue 는 한 번만 호출하고
// 나머지는 이 진행 중 Promise 를 함께 기다린다(single-flight).
let reissuePromise = null;

// 인증 흐름 자체의 401은 "진짜 실패"이므로 재발급을 시도하지 않는다(무한 루프 방지).
const AUTH_PASSTHROUGH = ["/auth/oauth2", "/auth/reissue", "/auth/logout"];

apiClient.interceptors.response.use(
  (response) => {
    // 공통 응답 포맷을 풀어 React Query가 data만 바로 사용하도록 한다.
    if (response.data && typeof response.data === "object" && "success" in response.data) {
      if (response.data.success === false) {
        return Promise.reject(response.data.error);
      }
      return response.data.data;
    }
    return response.data;
  },
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthFlow =
      original?.url && AUTH_PASSTHROUGH.some((p) => original.url.includes(p));

    // AUTH-03: access_token 만료(401) → refresh 쿠키로 1회 자동 재발급 후 원요청 재시도.
    if (status === 401 && original && !original._retried && !isAuthFlow) {
      original._retried = true;
      try {
        // 진행 중인 재발급이 없으면 새로 시작하고, 끝나면 비워 다음 만료 때 다시 쓰게 한다.
        if (!reissuePromise) {
          reissuePromise = apiClient
            .post("/auth/reissue")
            .finally(() => {
              reissuePromise = null;
            });
        }
        await reissuePromise; // 새 access/refresh 쿠키가 응답으로 심긴다
        return apiClient(original); // 새 쿠키로 원요청 재시도
      } catch {
        // 재발급 실패 = 세션 만료. 원래 401을 통일된 형태로 reject → ProtectedRoute가 로그인 처리.
        return Promise.reject(error.response?.data?.error ?? error);
      }
    }

    return Promise.reject(error.response?.data?.error ?? error);
  }
);
