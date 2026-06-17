import { apiClient } from "../../lib/api/client";

export async function getSchedules(params) {
  return apiClient.get("/schedules", { params });
}

export async function createSchedule(applicationId, body) {
  return apiClient.post(`/applications/${applicationId}/schedules`, body);
}

export async function updateSchedule(scheduleId, body) {
  return apiClient.put(`/schedules/${scheduleId}`, body);
}

export async function deleteSchedule(scheduleId) {
  return apiClient.delete(`/schedules/${scheduleId}`);
}
