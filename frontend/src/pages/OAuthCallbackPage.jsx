import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

// AUTH-02: Spring Security OAuth 인증 완료 후 리다이렉트되는 페이지.
// 서버가 Set-Cookie로 인증 쿠키를 심어둔 상태이므로 currentUser 캐시를 무효화 후 대시보드로 이동한다.
export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const error = params.get("error");
    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
      return;
    }
    // 쿼리 캐시를 무효화해서 ProtectedRoute의 useCurrentUser가 다시 조회하도록 한다.
    // (OAuth 콜백 후 쿠키가 새로 설정되었으므로)
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    navigate("/dashboard", { replace: true });
  }, [navigate, params, queryClient]);

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
      로그인 처리 중...
    </div>
  );
}
