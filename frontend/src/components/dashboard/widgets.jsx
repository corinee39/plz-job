import { AsyncBoundary } from "../common/AsyncBoundary";
import { LoadingSkeleton } from "../common/LoadingSkeleton";
import { useFilterStore } from "../../store/filterStore";

// 차트 색 — index.css @theme 토큰을 단일 출처로 참조("내 데이터=brand, 시장=market")
export const BRAND = "var(--color-brand)";
export const MARKET = "var(--color-market)";

// DASH-08: 기간 필터 선택지 (PeriodFilter 내부 전용)
const PERIOD_OPTIONS = [
  { value: "1m", label: "1개월" },
  { value: "3m", label: "3개월" },
  { value: "6m", label: "6개월" },
  { value: "1y", label: "1년" },
];

// 기간 토글(세그먼트) — 두 대시보드 페이지 공용
export function PeriodFilter() {
  const { period, setPeriod } = useFilterStore();
  return (
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
  );
}

export function FilterSelect({ value, onChange, options }) {
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

export function ChartCard({ title, badge, isLoading, isError, onRetry, children }) {
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
        loadingFallback={<LoadingSkeleton className="h-[300px] w-full" />}
      >
        {children}
      </AsyncBoundary>
    </div>
  );
}
