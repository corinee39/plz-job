import { useState } from "react";
import { User, Save, Check } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { AsyncBoundary } from "../components/common/AsyncBoundary";
import { Button } from "../components/common/Button";
import { useCurrentUser, useUpdateProfile } from "../features/auth/hooks";

const inputCls =
  "w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent";

// UI-10 — 닉네임, 희망 직무·지역, 주요 기술 스택 (AUTH-05)
export default function ProfilePage() {
  const { data: user, isLoading, isError, refetch } = useCurrentUser();

  return (
    <PageShell title="프로필" description="닉네임, 희망 직무/지역, 주요 기술 스택을 관리합니다." icon={User}>
      <AsyncBoundary isLoading={isLoading} isError={isError} onRetry={refetch}>
        {/* key로 user 도착 시 폼을 초기값으로 리셋한다 (useEffect 없이) */}
        <ProfileForm key={user?.userId} user={user} />
      </AsyncBoundary>
    </PageShell>
  );
}

function ProfileForm({ user }) {
  const save = useUpdateProfile();
  const [form, setForm] = useState({
    nickname: user?.nickname ?? "",
    desiredPosition: user?.desiredPosition ?? "",
    desiredRegion: user?.desiredRegion ?? "",
    techStacks: (user?.techStacks ?? []).join(", "),
  });
  const [saved, setSaved] = useState(false);

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
        <Button type="submit" disabled={save.isPending} icon={Save}>
          {save.isPending ? "저장 중…" : "저장"}
        </Button>
        {saved && !save.isPending && (
          <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
            <Check size={15} /> 저장되었습니다.
          </span>
        )}
      </div>
    </form>
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
