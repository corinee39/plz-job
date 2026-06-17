import { apiClient } from "../../lib/api/client";

export async function previewJobPosting(url) {
  return apiClient.post("/job-postings/preview", { url });
}

export async function createJobPosting(body) {
  return apiClient.post("/job-postings", body);
}

export async function getJobPostings(params) {
  return apiClient.get("/job-postings", { params });
}

export async function getJobPosting(id) {
  return apiClient.get(`/job-postings/${id}`);
}

export async function updateJobPosting(id, body) {
  return apiClient.put(`/job-postings/${id}`, body);
}

export async function deleteJobPosting(id) {
  return apiClient.delete(`/job-postings/${id}`);
}

export async function changeStage(applicationId, body) {
  return apiClient.put(`/applications/${applicationId}/stage`, body);
}

export async function getStageHistories(applicationId) {
  return apiClient.get(`/applications/${applicationId}/stage-histories`);
}
