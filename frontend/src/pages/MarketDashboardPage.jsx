import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { PageShell } from "../components/layout/PageShell";
import { EmptyState } from "../components/common/EmptyState";
import {
  BRAND, MARKET, PeriodFilter, ChartCard,
} from "../components/dashboard/widgets";
import {
  useStackTrends,
  useUserComparison,
  useRegionDistribution,
} from "../features/dashboard/hooks";

// UI-02: 대시보드(시장 데이터) — DASH-04·05·06
export default function MarketDashboardPage() {
  const stackTrends = useStackTrends();
  const comparison = useUserComparison();
  const regionDist = useRegionDistribution();

  // DASH-04: 시장에서 가장 많이 쓰이는 기술 스택 상위 6개(공고 수 내림차순)
  const stackTrendsData = [...(stackTrends.data?.trends ?? [])]
    .sort((a, b) => (b.postingCount ?? 0) - (a.postingCount ?? 0))
    .slice(0, 6);
  // DASH-06: 내가 가장 많이 지원한 기술 상위 6개(내 지원 비율 내림차순)
  const comparisonData = [...(comparison.data?.comparison ?? [])]
    .sort((a, b) => (b.userRatio ?? 0) - (a.userRatio ?? 0))
    .slice(0, 6);
  // DASH-05: 공고가 많은 지역 상위 7곳(공고 수 내림차순)
  const regionData = [...(regionDist.data?.regions ?? [])]
    .sort((a, b) => (b.postingCount ?? 0) - (a.postingCount ?? 0))
    .slice(0, 7);

  return (
    <PageShell
      title="시장 데이터"
      description="시장 채용 동향과 내 지원을 비교합니다."
    >
      {/* DASH-08: 기간 필터 */}
      <div className="flex flex-wrap gap-2">
        <PeriodFilter />
      </div>

      {/* 차트 그리드 — 시장 데이터(DASH-04·05·06) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* DASH-04: 시장 기술 스택 추세 */}
        <ChartCard
          title="시장 기술 스택 추세"
          isLoading={stackTrends.isLoading}
          isError={stackTrends.isError}
          onRetry={stackTrends.refetch}
        >
          {stackTrendsData.length === 0 ? (
            <EmptyState title="시장 데이터가 없습니다" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
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
            <p className="mt-1 text-xs text-zinc-400">
              사람인 최근 공고 30페이지 크롤링 기준({stackTrends.data.dataBaseDate})
            </p>
          )}
        </ChartCard>

        {/* DASH-06: 개인 vs 시장 기술 스택 비교 */}
        <ChartCard
          title="기술 스택 비교 (내 지원 vs 시장)"
          isLoading={comparison.isLoading}
          isError={comparison.isError}
          onRetry={comparison.refetch}
        >
          {comparisonData.length === 0 ? (
            <EmptyState title="비교 데이터가 없습니다" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
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
            <p className="mt-1 text-xs text-zinc-400">
              사람인 최근 공고 30페이지 크롤링 기준({comparison.data.dataBaseDate})
            </p>
          )}
        </ChartCard>

        {/* DASH-05: 지역별 채용 공고 수 */}
        <ChartCard
          title="지역별 채용 공고 수"
          isLoading={regionDist.isLoading}
          isError={regionDist.isError}
          onRetry={regionDist.refetch}
        >
          {regionData.length === 0 ? (
            <EmptyState title="지역 데이터가 없습니다" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
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
            <p className="mt-1 text-xs text-zinc-400">
              사람인 최근 공고 30페이지 크롤링 기준({regionDist.data.dataBaseDate})
            </p>
          )}
        </ChartCard>
      </div>
    </PageShell>
  );
}
