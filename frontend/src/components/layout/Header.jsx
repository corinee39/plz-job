import { useAuthStore } from "../../store/authStore";
import { useLogout } from "../../features/auth/hooks";

export function Header() {
  const user = useAuthStore((s) => s.user);
  const { mutate: doLogout, isPending } = useLogout();

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
      <div className="md:hidden font-semibold">Plz-Job</div>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        {user && (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{user.nickname}</span>
        )}
        <button
          onClick={() => doLogout()}
          disabled={isPending}
          className="rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
