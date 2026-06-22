import { AlertCircle, RefreshCw } from "lucide-react";

// API 오류 전용 — 데이터가 비어있는 것과 명확히 구분 (DASH-09, §12.3)
export function ErrorState({ title = "오류가 발생했습니다", description, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 py-12 text-center">
      <AlertCircle size={28} className="mb-2 text-red-500 dark:text-red-400" strokeWidth={1.8} />
      <p className="font-medium text-red-700 dark:text-red-300">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">{description}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-red-300 dark:border-red-700 px-4 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
        >
          <RefreshCw size={14} />
          다시 시도
        </button>
      )}
    </div>
  );
}
