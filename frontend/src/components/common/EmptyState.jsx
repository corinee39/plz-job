import { Link } from "react-router-dom";

// DASH-09: 오류와 데이터 없음 상태를 구분 표시하기 위한 공통 컴포넌트.
// 분모 0인 비율 등은 "계산할 데이터가 부족합니다" 문구를 사용한다(§7.5).
// 신규 사용자 온보딩을 위해 행동 유도(CTA)를 선택적으로 받는다:
//   - actionLabel + actionTo  → 라우터 Link 버튼
//   - actionLabel + onAction  → onClick 버튼
export function EmptyState({ title = "데이터가 없습니다", description, actionLabel, actionTo, onAction }) {
  const btnClass =
    "mt-4 inline-flex items-center rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-xs font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity";

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 py-16 text-center">
      <p className="font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      {actionLabel && actionTo && (
        <Link to={actionTo} className={btnClass}>{actionLabel}</Link>
      )}
      {actionLabel && !actionTo && onAction && (
        <button type="button" onClick={onAction} className={btnClass}>{actionLabel}</button>
      )}
    </div>
  );
}
