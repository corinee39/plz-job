import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import { AsyncBoundary } from "../components/common/AsyncBoundary";
import { EmptyState } from "../components/common/EmptyState";
import {
  getDocuments,
  getDocument,
  createDocument,
  uploadVersion,
  downloadVersion,
  deleteVersion,
} from "../features/documents/api";
import { DOCUMENT_TYPE_LABELS } from "../constants/stageCodes";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "text/plain"];

const inputCls =
  "rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

// UI-06 — 이력서·자소서 목록, 버전 업로드, 다운로드, 삭제 (DOC-01, 02, 04, 05)
export default function DocumentsPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);

  const docs = useQuery({ queryKey: ["documents"], queryFn: getDocuments });
  const detail = useQuery({
    queryKey: ["document", selectedId],
    queryFn: () => getDocument(selectedId),
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: createDocument,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      setSelectedId(data.documentId); // 새 문서를 바로 선택해 버전 업로드로 이어준다
    },
    onError: (err) => alert(err?.message ?? "문서 생성에 실패했습니다."),
  });

  return (
    <PageShell
      title="서류 관리"
      description="이력서·자기소개서를 업로드하고 버전을 관리합니다. (PDF, TXT / 최대 10MB)"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* 내 문서 */}
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 self-start">
          <h2 className="text-sm font-semibold">내 문서</h2>
          <CreateDocForm
            onCreate={(body) => createMutation.mutate(body)}
            pending={createMutation.isPending}
          />
          <AsyncBoundary
            isLoading={docs.isLoading}
            isError={docs.isError}
            onRetry={docs.refetch}
          >
            {(docs.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">
                문서가 없습니다. 이력서/자소서를 만들어 보세요.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {docs.data.map((d) => (
                  <li key={d.documentId}>
                    <button
                      onClick={() => setSelectedId(d.documentId)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        selectedId === d.documentId
                          ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800"
                          : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Chip>{DOCUMENT_TYPE_LABELS[d.documentType] ?? d.documentType}</Chip>
                        <span className="font-medium truncate">{d.title}</span>
                      </span>
                      <span className="mt-1 block text-xs text-zinc-400">
                        버전 {d.versionCount}개
                        {d.latestVersionName ? ` · 최신 ${d.latestVersionName}` : " · 업로드 전"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </AsyncBoundary>
        </section>

        {/* 선택한 문서의 버전 */}
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 self-start">
          {!selectedId ? (
            <EmptyState
              title="문서를 선택하세요"
              description="왼쪽에서 문서를 선택하면 버전을 업로드하고 관리할 수 있습니다."
            />
          ) : (
            <VersionPanel documentId={selectedId} detail={detail} />
          )}
        </section>
      </div>
    </PageShell>
  );
}

function VersionPanel({ documentId, detail }) {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [versionName, setVersionName] = useState("");
  const [description, setDescription] = useState("");
  const [uploadMsg, setUploadMsg] = useState(null); // { type, text }

  const upload = useMutation({
    mutationFn: (payload) => uploadVersion(documentId, payload),
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["document", documentId] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      setUploadMsg(
        v.extractStatus === "SUCCESS"
          ? { type: "success", text: "업로드 완료 · 텍스트 추출 성공" }
          : {
              type: "warn",
              text: "업로드 완료 · 텍스트 추출 실패 (다른 파일을 쓰거나 직접 입력하세요)",
            }
      );
      setVersionName("");
      setDescription("");
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (err) => alert(err?.message ?? "업로드에 실패했습니다."),
  });

  const removeVersion = useMutation({
    mutationFn: deleteVersion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document", documentId] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err) => alert(err?.message ?? "삭제에 실패했습니다."),
  });

  const handleUpload = (e) => {
    e.preventDefault();
    setUploadMsg(null);
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    // 백엔드도 최종 검증하지만, 클라이언트에서 먼저 막아 사용자 경험을 높인다 (§12.1, DOC-01)
    if (!ALLOWED.includes(file.type)) {
      setUploadMsg({ type: "error", text: "PDF 또는 TXT 파일만 업로드할 수 있어요." });
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadMsg({ type: "error", text: "파일은 최대 10MB까지예요." });
      return;
    }
    upload.mutate({ file, versionName: versionName || `v${(detail.data?.versions?.length ?? 0) + 1}`, description });
  };

  const handleDownload = async (versionId, fileName) => {
    try {
      const blob = await downloadVersion(versionId); // blob 응답
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName || "document";
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert(err?.message ?? "다운로드에 실패했습니다.");
    }
  };

  if (detail.isError) {
    return (
      <AsyncBoundary isError onRetry={detail.refetch}>
        {null}
      </AsyncBoundary>
    );
  }

  const doc = detail.data;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">
          {doc ? doc.title : "버전"}
          {doc && (
            <Chip className="ml-2">{DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}</Chip>
          )}
        </h2>
      </div>

      {/* 업로드 폼 */}
      <form onSubmit={handleUpload} className="space-y-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
        <div className="flex flex-wrap gap-2">
          <input
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder="버전명 (예: v2)"
            className={inputCls}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="설명 (선택)"
            className={`flex-1 ${inputCls}`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            required
            className="text-sm text-zinc-600 dark:text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:text-white dark:file:bg-zinc-100 dark:file:text-zinc-900"
          />
          <button
            type="submit"
            disabled={upload.isPending}
            className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm text-white dark:text-zinc-900 disabled:opacity-40"
          >
            {upload.isPending ? "업로드 중…" : "버전 업로드"}
          </button>
        </div>
        {uploadMsg && (
          <p
            className={`text-xs ${
              uploadMsg.type === "success"
                ? "text-green-600 dark:text-green-400"
                : uploadMsg.type === "warn"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-500"
            }`}
          >
            {uploadMsg.text}
          </p>
        )}
      </form>

      {/* 버전 목록 */}
      <AsyncBoundary isLoading={detail.isLoading}>
        {(doc?.versions ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            아직 업로드한 버전이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {doc.versions.map((v) => (
              <li
                key={v.versionId}
                className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{v.versionName}</span>
                    <span className="truncate text-zinc-500">{v.fileName}</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {formatBytes(v.sizeBytes)} · 텍스트 추출 {v.hasExtractedText ? "○" : "✕"}
                    {v.createdAt && ` · ${new Date(v.createdAt).toLocaleDateString("ko-KR")}`}
                  </p>
                  {v.description && (
                    <p className="text-xs text-zinc-500">{v.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleDownload(v.versionId, v.fileName)}
                    className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    다운로드
                  </button>
                  <button
                    disabled={removeVersion.isPending}
                    onClick={() => {
                      if (confirm("이 버전을 삭제할까요?")) removeVersion.mutate(v.versionId);
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
    </div>
  );
}

function CreateDocForm({ onCreate, pending }) {
  const [documentType, setDocumentType] = useState("RESUME");
  const [title, setTitle] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onCreate({ documentType, title: title.trim() });
        setTitle("");
      }}
      className="space-y-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3"
    >
      <div className="flex gap-2">
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className={inputCls}
        >
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="백엔드 이력서"
          required
          className={`flex-1 min-w-0 ${inputCls}`}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40"
      >
        {pending ? "만드는 중…" : "+ 문서 만들기"}
      </button>
    </form>
  );
}

function Chip({ children, className = "" }) {
  return (
    <span
      className={`rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-300 ${className}`}
    >
      {children}
    </span>
  );
}
