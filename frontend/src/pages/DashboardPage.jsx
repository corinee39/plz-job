import { PageShell } from "../components/layout/PageShell";
import { AsyncBoundary } from "../components/common/AsyncBoundary";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { useAuthStore } from "../store/authStore";

// UI-02: 핵심 지표, 월별 지원, 단계별 통과율, 기술 스택·지역 분석, AI 리포트 (DASH-01~10, AI-05)
// TODO(Day 3): useQuery("/api/dashboard/summary") 연동 후 isLoading/isError 실제 값으로 교체
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = false;
  const isError = false;

  return (
    <PageShell
      title="대시보드"
      description={user ? `${user.nickname}님의 지원 현황` : "지원 현황과 시장 데이터를 한눈에 확인합니다."}
    >
      <AsyncBoundary
        isLoading={isLoading}
        isError={isError}
        loadingFallback={<KpiSkeletons />}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="이번 달 지원 수" value="0" unit="건" />
          <KpiCard label="진행 중 공고 수" value="0" unit="건" />
          <KpiCard label="예정된 전형 수" value="0" unit="건" />
          <KpiCard label="최종 합격 수" value="0" unit="건" />
        </div>
      </AsyncBoundary>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPlaceholder label="월별 지원 추이" badge="DASH-01~03 · Day 3" />
        <ChartPlaceholder label="단계별 전형 퍼널" badge="DASH-04~06 · Day 3" />
        <ChartPlaceholder label="기술 스택 비교 (내 지원 vs 시장)" badge="DASH-07~08 · Day 5" />
        <ChartPlaceholder label="지역별 채용 공고 수" badge="market · Day 5" />
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">AI 분석 리포트</p>
          <button className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-xs text-white dark:text-zinc-900 hover:opacity-90 transition-opacity">
            AI 분석하기
          </button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          AI 분석하기를 누르면 위 차트 수치를 바탕으로 자연어 리포트가 생성됩니다. (AI-05 · Day 4)
        </p>
      </div>
    </PageShell>
  );
}

function KpiCard({ label, value, unit }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-1">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-2xl font-bold">
        {value}
        <span className="ml-1 text-sm font-normal text-zinc-500">{unit}</span>
      </p>
    </div>
  );
}

function KpiSkeletons() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
          <LoadingSkeleton className="h-3 w-2/3" />
          <LoadingSkeleton className="h-8 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function ChartPlaceholder({ label, badge }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 h-52 flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium">{label}</p>
        {badge && (
          <span className="text-xs text-zinc-400 shrink-0 ml-2">{badge}</span>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center text-xs text-zinc-400">
        Recharts 차트 영역
      </div>
    </div>
  );
}
