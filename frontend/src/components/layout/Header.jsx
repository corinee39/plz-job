import { Sun, Moon, LogOut, Sparkles } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useLogout } from "../../features/auth/hooks";
import { useThemeStore } from "../../store/themeStore";

export function Header() {
  const user = useAuthStore((s) => s.user);
  const { mutate: doLogout, isPending } = useLogout();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
      <div className="md:hidden flex items-center gap-1.5 font-semibold">
        <Sparkles size={18} className="text-brand" strokeWidth={2.2} />
        Plz-Job
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        {user && (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {user.nickname} 님
          </span>
        )}
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
          className="rounded-md border border-zinc-200 dark:border-zinc-700 p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={() => doLogout()}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          <LogOut size={14} />
          로그아웃
        </button>
      </div>
    </header>
  );
}
