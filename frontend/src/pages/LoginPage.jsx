import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, LogIn } from "lucide-react";
import { getOAuthUrl } from "../features/auth/api.js";

// AUTH-01: 카카오·구글 소셜 로그인 (§12.1 OAuth 리다이렉트 방식)
const OAUTH_PROVIDERS = [
  {
    key: "kakao",
    label: "카카오로 로그인",
    className: "bg-[#FEE500] text-[#191919] hover:bg-[#FDD835] disabled:opacity-60",
  },
  {
    key: "google",
    label: "Google로 로그인",
    className:
      "border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60",
  },
];

export default function LoginPage() {
  const [params] = useSearchParams();
  const [loadingProvider, setLoadingProvider] = useState(null);
  // 콜백 실패(?error=)와 로그인 시작 요청 실패를 함께 표시한다.
  const [startFailed, setStartFailed] = useState(false);
  const error = params.get("error") || startFailed;

  // AUTH-01: 백엔드에서 authorizationUrl(JSON)을 받아 이동 (302 직접 이동 방식 아님)
  async function handleLogin(provider) {
    setStartFailed(false);
    setLoadingProvider(provider);
    try {
      const { authorizationUrl } = await getOAuthUrl(provider);
      window.location.assign(authorizationUrl);
    } catch (e) {
      // 백엔드 5xx 등으로 인가 URL 발급이 실패하면 버튼이 "죽은 듯" 보이지 않게 알린다.
      console.error("OAuth 로그인 시작 실패:", e);
      setStartFailed(true);
      setLoadingProvider(null);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center shadow-sm">
        <div className="space-y-1">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles size={24} className="text-brand" strokeWidth={2.2} />
            Plz-Job
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            취업 공고와 지원 기록을 한곳에서 관리하고,
            <br />
            시장 데이터와 비교하세요.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            로그인에 실패했습니다. 다시 시도해 주세요.
          </div>
        )}

        <div className="space-y-2">
          {OAUTH_PROVIDERS.map((p) => (
            <button
              key={p.key}
              onClick={() => handleLogin(p.key)}
              disabled={loadingProvider !== null}
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${p.className}`}
            >
              <LogIn size={16} />
              {loadingProvider === p.key ? "연결 중..." : p.label}
            </button>
          ))}

        </div>
      </div>
    </div>
  );
}
