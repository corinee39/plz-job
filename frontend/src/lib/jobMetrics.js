import { differenceInCalendarDays } from "date-fns";

// 공고 지표 계산 모음 — 순수 함수만 둔다(컴포넌트/훅에서 import).
// 단계 코드는 §7.2(stageCodes.js)를 단일 출처로 참조한다.

// 더 이상 진행이 없는 종료 단계 — D-day/매칭 계산에서 제외한다.
export const TERMINAL_STAGES = new Set([
  "DOCUMENT_FAIL",
  "CODING_FAIL",
  "INTERVIEW_FAIL",
  "FINAL_PASS",
  "WITHDRAWN",
]);

export function isActiveStage(stage) {
  return !TERMINAL_STAGES.has(stage);
}

// 마감일까지 남은 일수(오늘 기준 캘린더 일수). 날짜 없으면 null.
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  return differenceInCalendarDays(target, new Date());
}

// D-day 라벨: 미래=D-n, 당일=D-DAY, 지남=D+n
export function ddayLabel(days) {
  if (days == null) return null;
  if (days === 0) return "D-DAY";
  return days > 0 ? `D-${days}` : `D+${-days}`;
}

// 마감 임박도 톤: 지남=zinc, 0~3일=red, 4~7일=amber, 그 외=zinc
export function ddayTone(days) {
  if (days == null) return "zinc";
  if (days < 0) return "past";
  if (days <= 3) return "urgent";
  if (days <= 7) return "soon";
  return "normal";
}

// 보유 스택(프로필) vs 공고 요구 스택 일치율 (요구사항 §13.5)
// 비교는 소문자/공백 무시로 정규화하되, 표시는 공고 원본 라벨을 쓴다.
export function stackMatch(userStacks = [], jobStacks = []) {
  const normalize = (s) => String(s).toLowerCase().replace(/\s+/g, "");
  const owned = new Set(userStacks.map(normalize));
  const matched = jobStacks.filter((s) => owned.has(normalize(s)));
  const missing = jobStacks.filter((s) => !owned.has(normalize(s)));
  const rate = jobStacks.length
    ? Math.round((matched.length / jobStacks.length) * 100)
    : null;
  return { matched, missing, rate, total: jobStacks.length };
}
