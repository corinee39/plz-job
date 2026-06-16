import { Link } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import { EmptyState } from "../components/common/EmptyState";

// UI-03 — 검색, 상태·기간 필터, 정렬, 공고 등록 (JOB-05, 06, 08)
export default function JobPostingListPage() {
  return (
    <PageShell title="공고 목록" description="내가 등록한 지원 공고를 관리합니다.">
      <div className="flex justify-end">
        <Link
          to="/job-postings/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          + 공고 등록
        </Link>
      </div>
      <EmptyState title="등록된 공고가 없습니다" description="공고 URL을 입력해 자동으로 등록해 보세요." />
    </PageShell>
  );
}
