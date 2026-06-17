import { useEffect, useState } from "react";
import { PageShell } from "../components/layout/PageShell";
import { AsyncBoundary } from "../components/common/AsyncBoundary";
import { useCurrentUser, useUpdateProfile } from "../features/auth/hooks";

const inputCls =
  "w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent";

const EMPTY = { nickname: "", desiredPosition: "", desiredRegion: "", techStacks: "" };

// UI-10 — 닉네임, 희망 직무·지역, 주요 기술 스택 (AUTH-05)
export default function ProfilePage() {
  const { data: user, isLoading, isError, refetch } = useCurrentUser();
  const save = useUpdateProfile();
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(false);

  // 서버에서 받은 프로필로 폼을 초기화한다.
  useEffect(() => {
    if (user) {
      setForm({
        nickname: user.nickname ?? "",
        desiredPosition: user.desiredPosition ?? "",
        desiredRegion: user.desiredRegion ?? "",
        techStacks: (user.techStacks ?? []).join(", "),
      });
    }
  }, [user]);

  const set = (key) => (e) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nickname.trim()) return;
    save.mutate(
      {
        nickname: form.nickname.trim(),
        desiredPosition: form.desiredPosition.trim() || null,
        desiredRegion: form.desiredRegion.trim() || null,
        techStacks: form.techStacks
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
      {
        onSuccess: () => setSaved(true),
        onError: (err) => alert(err?.message ?? "프로필 저장에 실패했습니다."),
      }
    );
  };

  return (
    <PageShell title="프로필" description="닉네임, 희망 직무/지역, 주요 기술 스택을 관리합니다.">
      <AsyncBoundary isLoading={isLoading} isError={isError} onRetry={refetch}>
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
          {/* 소셜 계정 정보 (읽기 전용) */}
          {user && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="text-zinc-500">{user.email}</span>
              {user.provider && (
                <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                  {user.provider} 연동
                </span>
              )}
            </div>
          )}

          <Field label="닉네임 *" value={form.nickname} onChange={set("nickname")} required />
          <Field
            label="희망 직무"
            value={form.desiredPosition}
            onChange={set("desiredPosition")}
            placeholder="백엔드"
          />
          <Field
            label="희망 지역"
            value={form.desiredRegion}
            onChange={set("desiredRegion")}
            placeholder="서울"
          />
          <Field
            label="주요 기술 스택 (쉼표로 구분)"
            value={form.techStacks}
            onChange={set("techStacks")}
            placeholder="Java, Spring Boot, Oracle"
          />

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={save.isPending}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-40"
            >
              {save.isPending ? "저장 중…" : "저장"}
            </button>
            {saved && !save.isPending && (
              <span className="text-sm text-green-600 dark:text-green-400">저장되었습니다.</span>
            )}
          </div>
        </form>
      </AsyncBoundary>
    </PageShell>
  );
}

function Field({ label, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={inputCls}
      />
    </div>
  );
}
