import { create } from "zustand";

// 로그인 사용자 정보 — AUTH-01~06. 토큰 자체는 HttpOnly 쿠키로 다루므로 여기서는 보관하지 않는다.
export const useAuthStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
