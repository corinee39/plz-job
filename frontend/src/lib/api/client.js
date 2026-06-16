import axios from "axios";

// 요구사항 명세서 §11 공통 응답 형식: { success, data, error, timestamp }
// 인증 토큰은 Secure·HttpOnly 쿠키 권장(§12.1)이므로 withCredentials를 기본 켠다.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 10_000,
  withCredentials: true,
});

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
  (error) => {
    // 401 등 인증 만료 시 처리는 추후 authStore와 연동하여 로그아웃 처리한다.
    return Promise.reject(error.response?.data?.error ?? error);
  }
);
