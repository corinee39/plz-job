import { useAuthStore } from "../../store/authStore";

export function Header() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
      <div className="md:hidden font-semibold">Plz-Job</div>
      <div className="flex-1" />
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        {user ? user.nickname : "로그인이 필요합니다"}
      </div>
    </header>
  );
}
