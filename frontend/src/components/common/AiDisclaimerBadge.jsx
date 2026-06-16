// AI-08: AI 생성 콘텐츠임을 항상 표시한다.
export function AiDisclaimerBadge({ text = "AI가 생성한 연습용 콘텐츠이며 실제 결과를 보장하지 않습니다." }) {
  return (
    <p className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">
      ⚠ {text}
    </p>
  );
}
