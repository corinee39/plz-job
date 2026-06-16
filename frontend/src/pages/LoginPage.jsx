// UI-01 — 카카오/구글 로그인, 서비스 소개 (AUTH-01)
const OAUTH_PROVIDERS = [
  { key: "kakao", label: "카카오로 로그인" },
  { key: "google", label: "구글로 로그인" },
];

// 백엔드 Spring Security가 처리하는 OAuth 리다이렉트 진입점 (§11.1)
function redirectToOAuth(provider) {
  window.location.href = `${import.meta.env.VITE_API_BASE_URL ?? "/api"}/auth/oauth2/${provider}`;
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center">
        <h1 className="text-lg font-semibold">Plz-Job</h1>
        <p className="text-sm text-zinc-500">
          취업 공고와 지원 기록을 한곳에서 관리하고, 시장 데이터와 비교하세요.
        </p>
        <div className="space-y-2">
          {OAUTH_PROVIDERS.map((p) => (
            <button
              key={p.key}
              onClick={() => redirectToOAuth(p.key)}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
