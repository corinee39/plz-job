import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Cell,
  LineChart, Line,
} from "recharts";
import { Link } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import { AsyncBoundary } from "../components/common/AsyncBoundary";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { EmptyState } from "../components/common/EmptyState";
import { AiDisclaimerBadge } from "../components/common/AiDisclaimerBadge";
import { DdayBadge } from "../components/common/DdayBadge";
import { BRAND, PeriodFilter, ChartCard } from "../components/dashboard/widgets";
import { useJobPostings } from "../features/jobPostings/hooks";
import { daysUntil, isActiveStage } from "../lib/jobMetrics";
import { useFilterStore } from "../store/filterStore";
import {
  useDashboardSummary,
  useMonthlyApplications,
  useStageConversions,
  useDashboardReport,
} from "../features/dashboard/hooks";

// 마감 임박 기준일(D-day 상한). 이 일수 이내로 마감하는 진행 중 공고만 노출.
const DEADLINE_SOON_DAYS = 5;

// DASH-02·03 — 퍼널 단계 라벨
const FUNNEL_LABELS = {
  APPLIED: "지원완료",
  DOCUMENT: "서류",
  CODING_TEST: "코딩테스트",
  INTERVIEW: "면접",
  FINAL: "최종",
};

// 퍼널 단계별 brand 농도 그라데이션(위→아래로 옅어짐)
const FUNNEL_COLORS = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"];

// UI-02: 대시보드(지원 현황) — DASH-01·02·03, AI-05
export default function DashboardPage() {
  const { period, job, region } = useFilterStore();

  const summary = useDashboardSummary();
  const monthly = useMonthlyApplications();
  const stages = useStageConversions();
  const reportMutation = useDashboardReport();

  const monthlyData = (monthly.data?.monthly ?? []).map((m) => ({
    ...m,
    name: m.month.replace(/^\d{4}-0?/, "") + "월",
  }));
  const stageData = (stages.data?.stages ?? []).map((s, i) => ({
    ...s,
    name: FUNNEL_LABELS[s.stage] ?? s.stage,
    fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
  }));

  const handleAiReport = () =>
    reportMutation.mutate({ period, position: job || undefined, region: region || undefined });

  return (
    <PageShell
      title="지원 현황"
      description="내 지원 현황과 진행 상황을 한눈에 확인합니다."
    >
      {/* DASH-08: 기간 필터 */}
      <div className="flex flex-wrap gap-2">
        <PeriodFilter />
      </div>

      {/* KPI 카드 */}
      <AsyncBoundary
        isLoading={summary.isLoading}
        isError={summary.isError}
        onRetry={summary.refetch}
        loadingFallback={<KpiSkeletons />}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard
            label="이번 달 지원 수"
            value={summary.data?.thisMonthApplications ?? 0}
            unit="건"
            delta={summary.data?.applicationsDelta}
            spark={monthlyData}
          />
          <KpiCard label="진행 중 공고 수" value={summary.data?.inProgressCount ?? 0} unit="건" delta={summary.data?.inProgressDelta} />
          <KpiCard label="예정된 전형 수" value={summary.data?.upcomingSchedules ?? 0} unit="건" delta={summary.data?.upcomingDelta} />
          <KpiCard label="최종 합격 수" value={summary.data?.finalPassCount ?? 0} unit="건" delta={summary.data?.finalPassDelta} />
        </div>
        {summary.data?.dataBaseDate && (
          <p className="text-xs text-zinc-400 -mt-2">
            표본 {summary.data.sampleSize}건 · 합격률 {summary.data.overallPassRate}% · 데이터 기준일 {summary.data.dataBaseDate}
          </p>
        )}
      </AsyncBoundary>

      {/* 마감 임박 공고 (JOB-08) — 진행 중 공고를 마감일 순으로(D-5 이내) */}
      <DeadlineWidget />

      {/* 차트 그리드 — 개인 지원 데이터(DASH-01·02·03) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* DASH-01: 월별 지원 추이 */}
        <ChartCard
          title="월별 지원 추이"
          badge="DASH-01"
          isLoading={monthly.isLoading}
          isError={monthly.isError}
          onRetry={monthly.refetch}
        >
          {monthlyData.length === 0 ? (
            <EmptyState
              title="지원 기록이 없습니다"
              description="첫 공고를 등록하면 지원 추이가 여기에 쌓입니다."
              actionLabel="+ 공고 등록"
              actionTo="/job-postings/new"
            />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v}건`, "지원 수"]} />
                <Bar dataKey="applied" fill={BRAND} radius={[3, 3, 0, 0]} name="지원 수" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* DASH-02·03: 단계별 통과율 */}
        <ChartCard
          title="단계별 통과율"
          badge="DASH-02·03"
          isLoading={stages.isLoading}
          isError={stages.isError}
          onRetry={stages.refetch}
        >
          {stageData.length === 0 ? (
            <EmptyState
              title="지원 기록이 없습니다"
              description="지원 단계를 기록하면 어디서 이탈하는지 한눈에 보입니다."
              actionLabel="+ 공고 등록"
              actionTo="/job-postings/new"
            />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <FunnelChart margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <Tooltip
                  formatter={(v, _name, props) => {
                    const { passRate } = props.payload;
                    return passRate != null
                      ? [`${v}건 (통과율 ${passRate}%)`, props.payload.name]
                      : [`${v}건`, props.payload.name];
                  }}
                />
                <Funnel dataKey="count" data={stageData} isAnimationActive>
                  <LabelList position="right" dataKey="name" fontSize={11} fill="#71717a" />
                  <LabelList position="inside" dataKey="count" fontSize={11} fill="#fff" />
                  {stageData.map((s) => (
                    <Cell key={s.stage} fill={s.fill} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          )}
          {stages.data?.note && (
            <p className="mt-1 text-xs text-zinc-400">{stages.data.note}</p>
          )}
        </ChartCard>
      </div>

      {/* AI-05: AI 분석 리포트 패널 */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">AI 분석 리포트</p>
          <button
            onClick={handleAiReport}
            disabled={reportMutation.isPending}
            className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-xs text-white dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {reportMutation.isPending ? "분석 중..." : "AI 분석하기"}
          </button>
        </div>

        {!reportMutation.data && !reportMutation.isPending && !reportMutation.isError && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            AI 분석하기를 누르면 지원 현황과 시장 데이터를 바탕으로 자연어 리포트가 생성됩니다.
          </p>
        )}

        {reportMutation.isPending && (
          <div className="space-y-2">
            <LoadingSkeleton className="h-3 w-full" />
            <LoadingSkeleton className="h-3 w-4/5" />
            <LoadingSkeleton className="h-3 w-3/5" />
          </div>
        )}

        {reportMutation.isError && (
          <p className="text-xs text-red-500">리포트 생성에 실패했습니다. 다시 시도해 주세요.</p>
        )}

        {reportMutation.data && (
          <div className="space-y-3">
            <div className="space-y-2">
              <ReportSection label="핵심 변화" text={reportMutation.data.keyChanges} />
              <ReportSection label="개인 vs 시장" text={reportMutation.data.userVsMarket} />
              <ReportSection label="주의사항" text={reportMutation.data.cautions} />
            </div>
            <AiDisclaimerBadge text={reportMutation.data.disclaimer} />
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ── 헬퍼 컴포넌트 ──────────────────────────────────────────────────

// 진행 중(종료 단계 제외) 공고를 마감 임박 순으로 보여준다. 마감 지난 건은 제외.
function DeadlineWidget() {
  const { data, isLoading, isError, refetch } = useJobPostings({ page: 0, size: 100 });

  const upcoming = (data?.content ?? [])
    .filter((j) => j.deadline && isActiveStage(j.currentStage ?? j.stage))
    .map((j) => ({ ...j, days: daysUntil(j.deadline) }))
    .filter((j) => j.days != null && j.days >= 0 && j.days <= DEADLINE_SOON_DAYS)
    .sort((a, b) => a.days - b.days);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">마감 임박 공고</p>
        <Link to="/board" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
          보드에서 관리 →
        </Link>
      </div>
      <AsyncBoundary
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        loadingFallback={<LoadingSkeleton className="h-20 w-full" />}
      >
        {upcoming.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {DEADLINE_SOON_DAYS}일 이내 마감 임박 공고가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {upcoming.map((j) => (
              <li key={j.jobPostingId} className="flex items-center justify-between gap-2 py-2">
                <Link
                  to={`/job-postings/${j.jobPostingId}`}
                  className="min-w-0 flex-1 truncate text-sm hover:underline"
                >
                  <span className="text-zinc-500">{j.companyName}</span>
                  <span className="mx-1 text-zinc-300">·</span>
                  {j.title}
                </Link>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-zinc-400">{j.deadline}</span>
                  <DdayBadge deadline={j.deadline} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
    </div>
  );
}

function KpiCard({ label, value, unit, delta, spark }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-1">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold">
          {value}
          <span className="ml-1 text-sm font-normal text-zinc-500">{unit}</span>
        </p>
        {spark?.length > 1 && (
          <div className="h-8 w-16 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <Line type="monotone" dataKey="applied" stroke={BRAND} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <DeltaBadge delta={delta} />
    </div>
  );
}

// 지난달 대비 증감 배지 — 양수=증가(emerald), 음수=감소(red), 0=유지(zinc)
function DeltaBadge({ delta }) {
  if (delta == null) return null;
  const tone =
    delta > 0 ? "text-emerald-600 dark:text-emerald-400"
    : delta < 0 ? "text-red-500"
    : "text-zinc-400";
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "–";
  return (
    <p className={`text-xs ${tone}`}>
      {arrow} {delta === 0 ? "변동 없음" : `${Math.abs(delta)}건 지난달 대비`}
    </p>
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

function ReportSection({ label, text }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{text}</p>
    </div>
  );
}
