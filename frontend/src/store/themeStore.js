import { create } from "zustand";

// UI-03: 다크/라이트 모드 수동 전환. localStorage에 유지, 미설정 시 시스템 선호도 따름.
const stored = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const initial = stored ?? (prefersDark ? "dark" : "light");

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

applyTheme(initial);

export const useThemeStore = create((set) => ({
  theme: initial,
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      applyTheme(next);
      return { theme: next };
    }),
}));
