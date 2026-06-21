import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
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
import { useJobPostings } from "../features/jobPostings/hooks";
import { daysUntil, isActiveStage } from "../lib/jobMetrics";
import { useFilterStore } from "../store/filterStore";
import {
  useDashboardSummary,
  useMonthlyApplications,
  useStageConversions,
  useStackTrends,
  useUserComparison,
  useRegionDistribution,
  useDashboardReport,
} from "../features/dashboard/hooks";

// DASH-08: 필터 선택지
const PERIOD_OPTIONS = [
  { value: "1m", label: "1개월" },
  { value: "3m", label: "3개월" },
  { value: "6m", label: "6개월" },
  { value: "1y", label: "1년" },
];

const POSITION_OPTIONS = [
  { value: "", label: "전체 직무" },
  { value: "백엔드", label: "백엔드" },
  { value: "프론트엔드", label: "프론트엔드" },
  { value: "풀스택", label: "풀스택" },
  { value: "데이터", label: "데이터" },
  { value: "AI", label: "AI" },
  { value: "모바일", label: "모바일" },
  { value: "DevOps", label: "DevOps" },
];

const REGION_OPTIONS = [
  { value: "", label: "전체 지역" },
  { value: "서울", label: "서울" },
  { value: "경기", label: "경기" },
  { value: "부산", label: "부산" },
  { value: "대전", label: "대전" },
  { value: "인천", label: "인천" },
];

// DASH-02·03 — 퍼널 단계 라벨
const FUNNEL_LABELS = {
  APPLIED: "지원완료",
  DOCUMENT: "서류",
  CODING_TEST: "코딩테스트",
  INTERVIEW: "면접",
  FINAL: "최종",
};

// 차트 색 — index.css @theme 토큰을 단일 출처로 참조("내 데이터=brand, 시장=market")
const BRAND = "var(--color-brand)";
const MARKET = "var(--color-market)";
// 퍼널 단계별 brand 농도 그라데이션(위→아래로 옅어짐)
const FUNNEL_COLORS = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"];

// UI-02: 대시보드 — DASH-01~09, AI-05
export default function DashboardPage() {
  const { period, job, region, setPeriod, setJob, setRegion } = useFilterStore();

  const summary = useDashboardSummary();
  const monthly = useMonthlyApplications();
  const stages = useStageConversions();
  const stackTrends = useStackTrends();
  const comparison = useUserComparison();
  const regionDist = useRegionDistribution();
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
  const stackTrendsData = (stackTrends.data?.trends ?? []).slice(0, 6);
  const comparisonData = (comparison.data?.comparison ?? []).slice(0, 6);
  const regionData = (regionDist.data?.regions ?? []).slice(0, 5);

  const handleAiReport = () =>
    reportMutation.mutate({ period, position: job || undefined, region: region || undefined });

  return (
    <PageShell
      title="대시보드"
      description="지원 현황과 시장 데이터를 한눈에 확인합니다."
    >
      {/* DASH-08: 필터 바 */}
      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-xs">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setPeriod(o.value)}
              className={`px-3 py-1.5 transition-colors ${
                period === o.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <Select value={job} onChange={setJob} options={POSITION_OPTIONS} />
        <Select value={region} onChange={setRegion} options={REGION_OPTIONS} />
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

      {/* 마감 임박 공고 (JOB-08) — 진행 중 공고를 마감일 순으로 */}
      <DeadlineWidget />

      {/* 차트 2×2 그리드 */}
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
            <ResponsiveContainer width="100%" height={220}>
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
            <ResponsiveContainer width="100%" height={220}>
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

        {/* DASH-04: 시장 기술 스택 추세 */}
        <ChartCard
          title="시장 기술 스택 추세"
          badge="DASH-04"
          isLoading={stackTrends.isLoading}
          isError={stackTrends.isError}
          onRetry={stackTrends.refetch}
        >
          {stackTrendsData.length === 0 ? (
            <EmptyState title="시장 데이터가 없습니다" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stackTrendsData} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="stack" tick={{ fontSize: 11 }} width={72} />
                <Tooltip
                  formatter={(v, _name, props) => [
                    `${v}% (${props.payload.postingCount?.toLocaleString()}건)`,
                    "시장 비율",
                  ]}
                />
                <Bar dataKey="ratio" fill={MARKET} radius={[0, 3, 3, 0]} name="시장 비율" />
              </BarChart>
            </ResponsiveContainer>
          )}
          {stackTrends.data?.dataBaseDate && (
            <p className="mt-1 text-xs text-zinc-400">시장 데이터 기준일: {stackTrends.data.dataBaseDate}</p>
          )}
        </ChartCard>

        {/* DASH-06: 개인 vs 시장 기술 스택 비교 */}
        <ChartCard
          title="기술 스택 비교 (내 지원 vs 시장)"
          badge="DASH-06"
          isLoading={comparison.isLoading}
          isError={comparison.isError}
          onRetry={comparison.refetch}
        >
          {comparisonData.length === 0 ? (
            <EmptyState title="비교 데이터가 없습니다" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={comparisonData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="stack" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`]} />
                <Legend />
                <Bar dataKey="userRatio" fill={BRAND} name="내 지원" radius={[3, 3, 0, 0]} />
                <Bar dataKey="marketRatio" fill={MARKET} name="시장" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {comparison.data?.dataBaseDate && (
            <p className="mt-1 text-xs text-zinc-400">시장 데이터 기준일: {comparison.data.dataBaseDate}</p>
          )}
        </ChartCard>

        {/* DASH-05: 지역별 채용 공고 수 */}
        <ChartCard
          title="지역별 채용 공고 수"
          badge="DASH-05"
          isLoading={regionDist.isLoading}
          isError={regionDist.isError}
          onRetry={regionDist.refetch}
        >
          {regionData.length === 0 ? (
            <EmptyState title="지역 데이터가 없습니다" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={regionData} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="region" tick={{ fontSize: 11 }} width={36} />
                <Tooltip formatter={(v) => [`${v.toLocaleString()}건`, "공고 수"]} />
                <Bar dataKey="postingCount" fill={MARKET} radius={[0, 3, 3, 0]} name="공고 수" />
              </BarChart>
            </ResponsiveContainer>
          )}
          {regionDist.data?.dataBaseDate && (
            <p className="mt-1 text-xs text-zinc-400">시장 데이터 기준일: {regionDist.data.dataBaseDate}</p>
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
            AI 분석하기를 누르면 위 차트 수치를 바탕으로 자연어 리포트가 생성됩니다.
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
              <ReportSection label="핵심 변화" text={reportMutation.data.report.keyChanges} />
              <ReportSection label="개인 vs 시장" text={reportMutation.data.report.userVsMarket} />
              <ReportSection label="주의사항" text={reportMutation.data.report.cautions} />
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
    .filter((j) => j.days != null && j.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

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
            마감이 임박한 진행 중 공고가 없습니다.
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

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
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

function ChartCard({ title, badge, isLoading, isError, onRetry, children }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        {badge && <span className="text-xs text-zinc-400">{badge}</span>}
      </div>
      <AsyncBoundary
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        loadingFallback={<LoadingSkeleton className="h-[220px] w-full" />}
      >
        {children}
      </AsyncBoundary>
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
