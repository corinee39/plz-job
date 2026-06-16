import { PageShell } from "../components/layout/PageShell";

// UI-10 — 닉네임, 희망 직무·지역, 주요 기술 스택 (AUTH-05)
export default function ProfilePage() {
  return (
    <PageShell title="프로필" description="닉네임, 희망 직무/지역, 주요 기술 스택을 관리합니다.">
      <form className="max-w-xl space-y-4">
        <Field label="닉네임" />
        <Field label="희망 직무" />
        <Field label="희망 지역" />
        <Field label="주요 기술 스택 (쉼표로 구분)" />
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
