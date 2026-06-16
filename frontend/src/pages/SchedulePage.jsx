import { PageShell } from "../components/layout/PageShell";

// UI-08 — 예정된 마감일, 코딩테스트, 면접 일정 조회 (PROC-01, 02, 05)
export default function SchedulePage() {
  return (
    <PageShell title="일정" description="전형 일정을 목록 또는 캘린더로 확인합니다.">
      <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 py-24 text-sm text-zinc-500">
        캘린더 영역 (react-big-calendar 연동 예정)
      </div>
    </PageShell>
  );
}
