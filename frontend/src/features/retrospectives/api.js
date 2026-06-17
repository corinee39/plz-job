import { apiClient } from "../../lib/api/client";

export async function getRetrospectives(applicationId) {
  return apiClient.get(`/applications/${applicationId}/retrospectives`);
}

export async function createRetrospective(applicationId, body) {
  return apiClient.post(`/applications/${applicationId}/retrospectives`, body);
}

export async function updateRetrospective(retrospectiveId, body) {
  return apiClient.put(`/retrospectives/${retrospectiveId}`, body);
}

export async function deleteRetrospective(retrospectiveId) {
  return apiClient.delete(`/retrospectives/${retrospectiveId}`);
}
