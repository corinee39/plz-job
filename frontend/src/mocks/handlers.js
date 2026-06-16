import { http, HttpResponse } from "msw";

// 백엔드 완성 전까지만 사용하는 임시 mock. §11 공통 응답 형식을 그대로 흉내낸다.
function ok(data) {
  return HttpResponse.json({ success: true, data, error: null, timestamp: new Date().toISOString() });
}

const mockJobPostings = [
  {
    jobPostingId: 1,
    companyName: "테크노바",
    title: "백엔드 개발자",
    region: "서울",
    position: "백엔드",
    deadline: "2026-07-01",
    url: "https://example.com/job/1",
  },
  {
    jobPostingId: 2,
    companyName: "데이터웍스",
    title: "프론트엔드 개발자",
    region: "경기",
    position: "프론트엔드",
    deadline: "2026-06-30",
    url: "https://example.com/job/2",
  },
];

export const handlers = [
  http.get("/api/job-postings", () => ok(mockJobPostings)),
  http.get("/api/dashboard/summary", () =>
    ok({ monthlyApplications: 0, inProgress: 0, upcomingSchedules: 0, finalPassCount: 0 })
  ),
];
