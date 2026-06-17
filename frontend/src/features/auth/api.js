import { apiClient } from "../../lib/api/client";

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
