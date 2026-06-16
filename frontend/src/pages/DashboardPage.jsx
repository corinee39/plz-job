import { PageShell } from "../components/layout/PageShell";

// UI-02 — 핵심 지표, 월별 지원, 단계별 통과율, 기술 스택·지역 분석, AI 리포트 (DASH-01~10, AI-05)
export default function DashboardPage() {
  return (
    <PageShell title="대시보드" description="지원 현황과 시장 데이터를 한눈에 확인합니다. (데이터 기준일: -)">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <KpiCard label="이번 달 지원 수" value="0" />
        <KpiCard label="진행 중 공고 수" value="0" />
        <KpiCard label="예정된 전형 수" value="0" />
        <KpiCard label="최종 합격 수" value="0" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartPlaceholder label="월별 지원 추이" />
        <ChartPlaceholder label="단계별 지원 현황 (퍼널)" />
        <ChartPlaceholder label="기술 스택 비교 (내 지원 vs 시장)" />
        <ChartPlaceholder label="지역별 채용 공고 수" />
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <p className="text-sm font-medium mb-2">AI 분석 리포트</p>
        <p className="text-xs text-zinc-500">
          AI 분석하기를 누르면 위 차트 수치를 바탕으로 자연어 리포트가 생성됩니다.
        </p>
      </div>
    </PageShell>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ChartPlaceholder({ label }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 h-48 flex flex-col">
      <p className="text-sm text-zinc-500">{label}</p>
      <div className="flex-1 flex items-center justify-center text-xs text-zinc-400">차트 영역(Recharts)</div>
    </div>
  );
}
