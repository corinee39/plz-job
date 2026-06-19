import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDocuments,
  getDocument,
  createDocument,
  uploadVersion,
  downloadVersion,
  deleteVersion,
  linkVersionToApplication,
} from "./api";

// DOC-01 — 문서 목록
export function useDocuments() {
  return useQuery({ queryKey: ["documents"], queryFn: getDocuments });
}

// DOC-02·03 — 문서 상세 (버전 목록 포함)
export function useDocument(documentId) {
  return useQuery({
    queryKey: ["document", documentId],
    queryFn: () => getDocument(documentId),
    enabled: !!documentId,
  });
}

// DOC-01·02 — 문서(논리 단위) 생성
export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

// DOC-01·02·05·06 — 버전 업로드
export function useUploadVersion(documentId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields) => uploadVersion(documentId, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document", documentId] }),
  });
}

// DOC-04 — 버전 다운로드 (mutation — 사용자 액션 시 호출)
export function useDownloadVersion() {
  return useMutation({ mutationFn: downloadVersion });
}

// DOC-04 — 버전 삭제
export function useDeleteVersion(documentId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteVersion,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document", documentId] }),
  });
}

// DOC-03 — 공고(지원)에 제출 문서 버전 연결
export function useLinkVersionToApplication(jobPostingId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, versionId }) => linkVersionToApplication(applicationId, versionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobPosting", jobPostingId] }),
  });
}
