import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { exchangeOAuthCode } from "../features/auth/api.js";

// AUTH-02: provider가 code를 들고 이 페이지(/auth/callback/:provider)로 리다이렉트한다.
// code를 백엔드 콜백에 넘겨 인증 쿠키를 발급받은 뒤 대시보드로 이동한다.
export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { provider } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // OAuth code는 1회용 → StrictMode 이중 실행으로 두 번 교환되지 않게 가드한다.
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const error = params.get("error");
    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
      return;
    }

    const code = params.get("code");
    if (!code || !provider) {
      navigate("/login?error=invalid_callback", { replace: true });
      return;
    }

    exchangeOAuthCode(provider, code)
      .then(() => {
        // 쿠키가 새로 설정되었으므로 ProtectedRoute의 useCurrentUser가 다시 조회하도록 무효화
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        navigate("/login?error=auth_failed", { replace: true });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
      로그인 처리 중...
    </div>
  );
}
