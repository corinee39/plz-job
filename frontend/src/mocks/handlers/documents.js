import { http, HttpResponse } from "msw";
import { ok } from "../helpers.js";
import { mockSubmittedDocs } from "../state.js";

// 문서 저장소 — 각 문서는 versions[]를 가진다 (DOC-01~05)
const mockDocuments = [
  {
    documentId: 3001,
    documentType: "RESUME",
    title: "백엔드 이력서",
    versions: [
      {
        versionId: 3101,
        versionName: "v1",
        description: "초안",
        fileName: "resume_v1.pdf",
        mimeType: "application/pdf",
        sizeBytes: 182000,
        hasExtractedText: true,
        createdAt: "2026-06-10T11:00:00+09:00",
      },
    ],
  },
];
let mockDocSeq = 3002;
let mockVersionSeq = 3102;

// versionId로 문서/버전 메타를 찾는 헬퍼
function findVersion(versionId) {
  for (const doc of mockDocuments) {
    const version = doc.versions.find((v) => v.versionId === versionId);
    if (version) return { doc, version };
  }
  return null;
}

export const documentHandlers = [
  // 문서 목록 — 각 문서의 최신 버전 요약 (DOC-01)
  http.get("/api/documents", () =>
    ok(
      mockDocuments.map((d) => ({
        documentId: d.documentId,
        documentType: d.documentType,
        title: d.title,
        versionCount: d.versions.length,
        latestVersionName: d.versions.at(-1)?.versionName ?? null,
        updatedAt: d.versions.at(-1)?.createdAt ?? null,
      }))
    )
  ),

  // 문서 상세 — 버전 목록 포함 (DOC-02·03)
  http.get("/api/documents/:documentId", ({ params }) => {
    const doc = mockDocuments.find((d) => d.documentId === Number(params.documentId));
    if (!doc) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "DOCUMENT_NOT_FOUND", message: "문서를 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    return ok(doc);
  }),

  // 문서(논리 단위) 생성 (DOC-01·02)
  http.post("/api/documents", async ({ request }) => {
    const body = await request.json();
    if (!body.documentType || !body.title) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "VALIDATION_FAILED", message: "문서 유형과 제목은 필수입니다." } },
        { status: 422 }
      );
    }
    const newDoc = {
      documentId: mockDocSeq++,
      documentType: body.documentType,
      title: body.title,
      versions: [],
    };
    mockDocuments.push(newDoc);
    return HttpResponse.json(
      {
        success: true,
        data: { documentId: newDoc.documentId, documentType: newDoc.documentType, title: newDoc.title },
        error: null,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // 버전 업로드 — multipart/form-data, PDF/TXT·10MB 검증 (DOC-01·02·05·06)
  http.post("/api/documents/:documentId/versions", async ({ params, request }) => {
    const doc = mockDocuments.find((d) => d.documentId === Number(params.documentId));
    if (!doc) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "DOCUMENT_NOT_FOUND", message: "문서를 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    const form = await request.formData();
    const file = form.get("file");
    const versionName = form.get("versionName");
    const description = form.get("description");

    const ALLOWED = ["application/pdf", "text/plain"];
    if (!file || !ALLOWED.includes(file.type)) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "UNSUPPORTED_FILE_TYPE", message: "PDF 또는 TXT 파일만 업로드할 수 있습니다." } },
        { status: 400 }
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "FILE_TOO_LARGE", message: "파일은 최대 10MB까지 업로드할 수 있습니다." } },
        { status: 413 }
      );
    }

    // 빈 파일이면 텍스트 추출 실패로 시뮬레이션 (extractStatus 분기 확인용)
    const extractStatus = file.size > 0 ? "SUCCESS" : "FAILED";
    const newVersion = {
      versionId: mockVersionSeq++,
      versionName: versionName || `v${doc.versions.length + 1}`,
      description: description || null,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      hasExtractedText: extractStatus === "SUCCESS",
      createdAt: new Date().toISOString(),
    };
    doc.versions.push(newVersion);
    return HttpResponse.json(
      {
        success: true,
        data: {
          versionId: newVersion.versionId,
          versionName: newVersion.versionName,
          fileName: newVersion.fileName,
          mimeType: newVersion.mimeType,
          sizeBytes: newVersion.sizeBytes,
          extractStatus,
          extractedTextLength: extractStatus === "SUCCESS" ? Math.floor(file.size / 4) : 0,
        },
        error: null,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // 버전 다운로드 — 파일 스트림(blob) (DOC-04)
  http.get("/api/document-versions/:versionId/download", ({ params }) => {
    const found = findVersion(Number(params.versionId));
    if (!found) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "DOCUMENT_NOT_FOUND", message: "문서를 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    const { version } = found;
    const content = `[Plz-Job mock 파일]\n파일명: ${version.fileName}\n버전: ${version.versionName}\n생성: ${version.createdAt}`;
    return new HttpResponse(content, {
      status: 200,
      headers: {
        "Content-Type": version.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${version.fileName}"`,
      },
    });
  }),

  // 버전 삭제 (DOC-04)
  http.delete("/api/document-versions/:versionId", ({ params }) => {
    const found = findVersion(Number(params.versionId));
    if (found) {
      found.doc.versions = found.doc.versions.filter(
        (v) => v.versionId !== Number(params.versionId)
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // 공고(지원)에 제출 문서 버전 연결 (DOC-03)
  http.post("/api/applications/:applicationId/documents/:versionId", ({ params }) => {
    const appId = Number(params.applicationId);
    const found = findVersion(Number(params.versionId));
    if (!found) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: "DOCUMENT_NOT_FOUND", message: "문서를 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    if (!mockSubmittedDocs[appId]) mockSubmittedDocs[appId] = [];
    if (!mockSubmittedDocs[appId].some((d) => d.versionId === found.version.versionId)) {
      mockSubmittedDocs[appId].push({
        versionId: found.version.versionId,
        documentTitle: found.doc.title,
        versionName: found.version.versionName,
      });
    }
    return HttpResponse.json(
      {
        success: true,
        data: { applicationId: appId, versionId: found.version.versionId },
        error: null,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),
];
