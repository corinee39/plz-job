/**
 * AI 생성, 공고 URL 자동입력, 차트 로딩처럼 지연·실패 가능한 작업의
 * 로딩/에러/재시도 상태를 표준화한다. (§12.2 진행 상태 표시, §12.3 신뢰성)
 */
export function AsyncBoundary({
  isLoading,
  isError,
  onRetry,
  loadingFallback = <DefaultLoading />,
  errorFallback,
  children,
}) {
  if (isLoading) return loadingFallback;
  if (isError) {
    return (
      errorFallback ?? (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4 text-sm text-red-700 dark:text-red-300">
          <p>처리 중 문제가 발생했습니다.</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 rounded-md border border-red-300 px-3 py-1 text-xs hover:bg-red-100 dark:hover:bg-red-900"
            >
              다시 시도
            </button>
          )}
        </div>
      )
    );
  }
  return children;
}

function DefaultLoading() {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-zinc-500">
      불러오는 중...
    </div>
  );
}
