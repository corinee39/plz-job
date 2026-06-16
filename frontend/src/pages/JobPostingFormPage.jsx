import { PageShell } from "../components/layout/PageShell";

// UI-04 — URL 자동 입력, 수동 수정, 지원 상태 설정 (JOB-01~04, 09, CRAWL-01~07)
export default function JobPostingFormPage() {
  return (
    <PageShell title="공고 등록" description="공고 URL을 입력하면 정보를 자동으로 채웁니다.">
      <form className="max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">공고 URL</label>
          <input
            type="url"
            placeholder="https://..."
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent"
          />
          <p className="mt-1 text-xs text-zinc-500">
            자동 추출 실패 시 아래 항목을 직접 입력할 수 있습니다. (JOB-04 수동 입력 폴백)
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="회사명" />
          <Field label="공고명" />
          <Field label="직무" />
          <Field label="지역" />
          <Field label="시작일" type="date" />
          <Field label="마감일" type="date" />
        </div>
        <button
          type="button"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          저장
        </button>
      </form>
    </PageShell>
  );
}

function Field({ label, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent"
      />
    </div>
  );
}
