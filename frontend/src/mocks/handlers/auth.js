// AUTH 핸들러 제거 — 백엔드 인증·계정 엔드포인트(6개)가 실구현됨.
// MSW bypass passthrough로 실 백엔드(8080)로 직접 전달된다.
// 재연동 전략: docs/MSW_제거_및_백엔드_연동_방향성.md § Phase B
export const authHandlers = [];
