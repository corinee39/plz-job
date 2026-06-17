import { useSearchParams, useNavigate } from "react-router-dom";

// AUTH-01: 카카오·구글 소셜 로그인 (§12.1 OAuth 리다이렉트 방식)
const OAUTH_PROVIDERS = [
  {
    key: "kakao",
    label: "카카오로 로그인",
    className: "bg-[#FEE500] text-[#191919] hover:bg-[#FDD835]",
  },
  {
    key: "google",
    label: "Google로 로그인",
    className:
      "border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800",
  },
];

function redirectToOAuth(provider) {
  window.location.href = `${import.meta.env.VITE_API_BASE_URL ?? "/api"}/auth/oauth2/${provider}`;
}

export default function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const error = params.get("error");
  const isDev = import.meta.env.VITE_API_MOCKING === "enabled";

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Plz-Job</h1>
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
              onClick={() => redirectToOAuth(p.key)}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${p.className}`}
            >
              {p.label}
            </button>
          ))}

          {isDev && (
            <button
              onClick={() => navigate("/auth/callback")}
              className="w-full rounded-lg bg-blue-100 dark:bg-blue-950 px-4 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors border border-blue-200 dark:border-blue-800"
            >
              🧪 개발용 로그인 (MSW)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
