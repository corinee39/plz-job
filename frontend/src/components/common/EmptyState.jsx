// DASH-09: 오류와 데이터 없음 상태를 구분 표시하기 위한 공통 컴포넌트.
// 분모 0인 비율 등은 "계산할 데이터가 부족합니다" 문구를 사용한다(§7.5).
export function EmptyState({ title = "데이터가 없습니다", description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 py-16 text-center">
      <p className="font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
    </div>
  );
}
