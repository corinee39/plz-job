// 지원 단계 코드 — 요구사항 명세서 §7.2 그대로 사용
// 프론트는 이 키 값을 서버에 그대로 전송하고(JOB-07), 화면에는 라벨만 표시한다.
export const STAGE_CODES = {
  INTERESTED: "관심",
  PLANNED: "지원 예정",
  APPLIED: "지원 완료",
  DOCUMENT_PASS: "서류 합격",
  DOCUMENT_FAIL: "서류 불합격",
  CODING_TEST: "코딩테스트 예정/진행",
  CODING_PASS: "코딩테스트 합격",
  CODING_FAIL: "코딩테스트 불합격",
  INTERVIEW: "면접 예정/진행",
  INTERVIEW_PASS: "면접 합격",
  INTERVIEW_FAIL: "면접 불합격",
  FINAL_PASS: "최종 합격",
  WITHDRAWN: "지원 철회",
};

export const STAGE_KEYS = Object.keys(STAGE_CODES);

export const SCHEDULE_TYPE_LABELS = {
  DEADLINE: "마감",
  CODING_TEST: "코딩테스트",
  INTERVIEW: "면접",
  ETC: "기타",
};

export const DOCUMENT_TYPE_LABELS = {
  RESUME: "이력서",
  COVER_LETTER: "자기소개서",
};

export const RETRO_TYPE_LABELS = {
  CODING_TEST: "코딩테스트",
  INTERVIEW: "면접",
};

export const DIFFICULTY_LABELS = {
  EASY: "쉬움",
  NORMAL: "보통",
  HARD: "어려움",
};
