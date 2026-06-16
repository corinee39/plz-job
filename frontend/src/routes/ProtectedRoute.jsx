import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

// AUTH-03: 미인증 요청은 401 → 로그인 화면으로 리다이렉트
export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);

  // TODO: 실제로는 /api/users/me 조회 결과(React Query)로 인증 여부를 판단해야 한다.
  // 백엔드 연동 전 임시로 항상 통과시킨다.
  const isAuthenticated = Boolean(user) || true;

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
