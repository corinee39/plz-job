import { useParams } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";

// UI-09 — 코딩테스트·면접 회고 등록 및 수정 (PROC-03, 04)
export default function RetrospectivePage() {
  const { id } = useParams();

  return (
    <PageShell title="회고" description={`공고 #${id}의 코딩테스트·면접 회고를 기록합니다.`}>
      <form className="max-w-xl space-y-4">
        <Field label="유형 (코딩테스트/면접)" />
        <Field label="난이도" />
        <div>
          <label className="block text-sm font-medium mb-1">질문/답변</label>
          <textarea className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent" rows={4} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">개선점</label>
          <textarea className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent" rows={3} />
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

function Field({ label }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent" />
    </div>
  );
}
