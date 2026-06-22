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

// 칸반 보드용 단계 그룹 — 합격/불합격 쌍을 phase로 묶어 13컬럼을 6컬럼으로 축소한다.
// dropTarget: 다른 phase에서 카드를 드롭했을 때 설정할 대표(진입) 단계.
//   서류·최종은 중립 단계가 없어 합격 쪽(_PASS)을 기본값으로 두고, 불합격·철회는 상세 페이지에서 보정한다.
export const STAGE_PHASES = [
  { key: "INTEREST",  label: "관심·예정",   stages: ["INTERESTED", "PLANNED"],                          dropTarget: "INTERESTED" },
  { key: "APPLIED",   label: "지원",        stages: ["APPLIED"],                                        dropTarget: "APPLIED" },
  { key: "DOCUMENT",  label: "서류",        stages: ["DOCUMENT_PASS", "DOCUMENT_FAIL"],                 dropTarget: "DOCUMENT_PASS" },
  { key: "CODING",    label: "코딩테스트",  stages: ["CODING_TEST", "CODING_PASS", "CODING_FAIL"],      dropTarget: "CODING_TEST" },
  { key: "INTERVIEW", label: "면접",        stages: ["INTERVIEW", "INTERVIEW_PASS", "INTERVIEW_FAIL"],  dropTarget: "INTERVIEW" },
  { key: "FINAL",     label: "최종",        stages: ["FINAL_PASS", "WITHDRAWN"],                        dropTarget: "FINAL_PASS" },
];

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
