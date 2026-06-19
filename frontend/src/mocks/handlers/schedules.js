import { http, HttpResponse } from "msw";
import { ok } from "../helpers.js";
import { mockJobPostings } from "../state.js";

// 일정 저장소
const mockSchedules = [
  {
    scheduleId: 1,
    applicationId: 1001,
    jobPostingId: 1,
    companyName: "테크노바",
    jobTitle: "백엔드 개발자",
    scheduleType: "INTERVIEW",
    scheduledAt: "2026-06-25T14:00:00",
    location: "서울 강남구 테헤란로 123",
    notes: "포트폴리오 준비 필요",
  },
  {
    scheduleId: 2,
    applicationId: 2002,
    jobPostingId: 2,
    companyName: "데이터웍스",
    jobTitle: "프론트엔드 개발자",
    scheduleType: "CODING_TEST",
    scheduledAt: "2026-06-20T10:00:00",
    location: null,
    notes: "온라인 코딩테스트",
  },
];

export const scheduleHandlers = [
  http.get("/api/schedules", ({ request }) => {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const appId = url.searchParams.get("applicationId");

    let result = [...mockSchedules];
    if (appId) result = result.filter((s) => String(s.applicationId) === appId);
    if (from) result = result.filter((s) => s.scheduledAt >= from);
    if (to) result = result.filter((s) => s.scheduledAt <= to);
    result.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    return ok(result);
  }),

  http.post("/api/applications/:applicationId/schedules", async ({ params, request }) => {
    const body = await request.json();
    const appId = Number(params.applicationId);
    const job = mockJobPostings.find((j) => j.jobPostingId + 1000 === appId);
    const newSchedule = {
      scheduleId: Date.now(),
      applicationId: appId,
      jobPostingId: job?.jobPostingId ?? null,
      companyName: job?.companyName ?? "",
      jobTitle: job?.title ?? "",
      scheduleType: body.scheduleType,
      scheduledAt: body.scheduledAt,
      location: body.location ?? null,
      notes: body.notes ?? null,
    };
    mockSchedules.push(newSchedule);
    return HttpResponse.json(
      { success: true, data: newSchedule, error: null, timestamp: new Date().toISOString() },
      { status: 201 }
    );
  }),

  http.put("/api/schedules/:scheduleId", async ({ params, request }) => {
    const body = await request.json();
    const idx = mockSchedules.findIndex((s) => s.scheduleId === Number(params.scheduleId));
    if (idx === -1)
      return HttpResponse.json(
        { success: false, data: null, error: { code: "NOT_FOUND", message: "일정을 찾을 수 없습니다." } },
        { status: 404 }
      );
    mockSchedules[idx] = { ...mockSchedules[idx], ...body };
    return ok(mockSchedules[idx]);
  }),

  http.delete("/api/schedules/:scheduleId", ({ params }) => {
    const idx = mockSchedules.findIndex((s) => s.scheduleId === Number(params.scheduleId));
    if (idx !== -1) mockSchedules.splice(idx, 1);
    return ok(null);
  }),
];
