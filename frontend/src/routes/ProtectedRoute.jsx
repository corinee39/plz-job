import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "../features/auth/hooks";
import { useAuthStore } from "../store/authStore";

// AUTH-03: /api/users/me 조회 결과로 인증 여부를 판단한다.
// MSW(dev) 또는 실 백엔드가 응답하기 전까지는 "인증 확인 중" 스피너를 보여준다.
export function ProtectedRoute() {
  const { data: user, isLoading, isError } = useCurrentUser();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        인증 확인 중...
      </div>
    );
  }

  if (isError) return <Navigate to="/login" replace />;

  return <Outlet />;
}
