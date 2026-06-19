// 백엔드 실구현 완료 → bypass (해당 handlers/*.js 파일은 git에 보존):
//   인증·계정, 공고·지원(job-postings/applications), 문서(documents/document-versions)
// 아직 미구현이라 목 유지: 일정·회고·AI·대시보드/시장분석
import { dashboardHandlers } from "./handlers/dashboard.js";
import { scheduleHandlers } from "./handlers/schedules.js";
import { retroHandlers } from "./handlers/retrospectives.js";
import { aiHandlers } from "./handlers/ai.js";

// 백엔드 도메인이 실서버로 전환될 때마다 해당 import와 스프레드를 제거한다.
export const handlers = [
  ...dashboardHandlers,
  ...scheduleHandlers,
  ...retroHandlers,
  ...aiHandlers,
];
