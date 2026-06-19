import { useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { exchangeOAuthCode } from "../features/auth/api.js";

// AUTH-02: 카카오/구글이 code를 들고 이 페이지로 리다이렉트한다.
// code를 백엔드 /auth/oauth2/{provider}/callback 에 전달해 쿠키를 발급받고 대시보드로 이동.
export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { provider } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
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
