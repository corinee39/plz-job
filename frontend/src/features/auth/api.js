import { apiClient } from "../../lib/api/client";

// AUTH-01: provider 인가 URL 발급 (백엔드가 JSON으로 반환)
export async function getOAuthUrl(provider) {
  return apiClient.get(`/auth/oauth2/${provider}`);
}

export async function getCurrentUser() {
  return apiClient.get("/users/me");
}

export async function logout() {
  return apiClient.post("/auth/logout");
}

// 프로필 수정 (AUTH-05) — nickname·desiredPosition·desiredRegion·techStacks[]
export async function updateProfile(body) {
  return apiClient.put("/users/me/profile", body);
}
