import { Inbox } from "lucide-react";
import { LinkButton, Button } from "./Button";

// DASH-09: 오류와 데이터 없음 상태를 구분 표시하기 위한 공통 컴포넌트.
// 분모 0인 비율 등은 "계산할 데이터가 부족합니다" 문구를 사용한다(§7.5).
// 신규 사용자 온보딩을 위해 행동 유도(CTA)를 선택적으로 받는다:
//   - actionLabel + actionTo  → 라우터 Link 버튼
//   - actionLabel + onAction  → onClick 버튼
export function EmptyState({ title = "데이터가 없습니다", description, actionLabel, actionTo, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Inbox size={22} className="text-zinc-400" strokeWidth={1.8} />
      </div>
      <p className="font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      {actionLabel && actionTo && (
        <LinkButton to={actionTo} size="sm" className="mt-4">{actionLabel}</LinkButton>
      )}
      {actionLabel && !actionTo && onAction && (
        <Button onClick={onAction} size="sm" className="mt-4">{actionLabel}</Button>
      )}
    </div>
  );
}
