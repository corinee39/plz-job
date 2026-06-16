import { PageShell } from "../components/layout/PageShell";
import { EmptyState } from "../components/common/EmptyState";

// UI-06 — 이력서·자소서 목록, 버전 업로드, 다운로드, 삭제 (DOC-01, 02, 04, 05)
export default function DocumentsPage() {
  return (
    <PageShell title="서류 관리" description="이력서·자기소개서를 업로드하고 버전을 관리합니다. (PDF, TXT / 최대 10MB)">
      <div className="flex justify-end">
        <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          + 문서 업로드
        </button>
      </div>
      <EmptyState title="업로드된 문서가 없습니다" />
    </PageShell>
  );
}
