import { apiClient } from "../../lib/api/client";

export async function getCurrentUser() {
  return apiClient.get("/users/me");
}

export async function logout() {
  return apiClient.post("/auth/logout");
}
