import { daysUntil, ddayLabel, ddayTone } from "../../lib/jobMetrics";

// 마감일 D-day 배지 (JOB-08 · §12.4 — 색만이 아니라 텍스트로도 구분)
const TONE_CLASS = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  soon: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  normal: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  past: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 line-through",
  zinc: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

export function DdayBadge({ deadline }) {
  const days = daysUntil(deadline);
  if (days == null) return null;
  const tone = ddayTone(days);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}
      title={`마감 ${deadline}`}
    >
      {ddayLabel(days)}
    </span>
  );
}
