// 인증·계정 도메인은 백엔드 실구현 완료 → bypass (handlers/auth.js 파일은 git에 보존)
import { dashboardHandlers } from "./handlers/dashboard.js";
import { jobHandlers } from "./handlers/jobPostings.js";
import { documentHandlers } from "./handlers/documents.js";
import { scheduleHandlers } from "./handlers/schedules.js";
import { retroHandlers } from "./handlers/retrospectives.js";
import { aiHandlers } from "./handlers/ai.js";

// 백엔드 도메인이 실서버로 전환될 때마다 해당 import와 스프레드를 제거한다.
export const handlers = [
  ...dashboardHandlers,
  ...jobHandlers,
  ...documentHandlers,
  ...scheduleHandlers,
  ...retroHandlers,
  ...aiHandlers,
];
