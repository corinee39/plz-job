import { apiClient } from "../../lib/api/client";

// 문서(논리 단위) 목록 — 각 문서의 최신 버전 요약 (DOC-01)
export async function getDocuments() {
  return apiClient.get("/documents");
}

// 문서 상세 — 버전 목록 포함 (DOC-02·03)
export async function getDocument(documentId) {
  return apiClient.get(`/documents/${documentId}`);
}

// 문서(논리 단위) 생성 (DOC-01·02)
export async function createDocument(body) {
  return apiClient.post("/documents", body);
}

// 버전 업로드 — multipart/form-data (DOC-01·02·05·06)
// axios는 FormData를 감지해 multipart 경계를 자동 설정하므로 Content-Type을 지정하지 않는다.
export async function uploadVersion(documentId, { file, versionName, description }) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("versionName", versionName);
  if (description) fd.append("description", description);
  return apiClient.post(`/documents/${documentId}/versions`, fd);
}

// 버전 다운로드 — 봉투가 아닌 바이너리라 blob으로 받는다 (DOC-04)
export async function downloadVersion(versionId) {
  return apiClient.get(`/document-versions/${versionId}/download`, {
    responseType: "blob",
  });
}

// 버전 삭제 (DOC-04)
export async function deleteVersion(versionId) {
  return apiClient.delete(`/document-versions/${versionId}`);
}

// 공고(지원)에 제출 문서 버전 연결 (DOC-03)
export async function linkVersionToApplication(applicationId, versionId) {
  return apiClient.post(`/applications/${applicationId}/documents/${versionId}`);
}
