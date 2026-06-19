import { http, HttpResponse } from "msw";
import { ok } from "../helpers.js";
import { mockJobPostings } from "../state.js";

// PROC-01·02·05 — 일정 저장소 (API 명세서 §4.4 기준)
// 응답 필드: scheduleId, applicationId, companyName, scheduleType, startAt, status, memo
const mockSchedules = [
  {
    scheduleId: 1,
    applicationId: 1001,
    companyName: "테크노바",
    scheduleType: "INTERVIEW",
    startAt: "2026-06-25T14:00:00+09:00",
    memo: "포트폴리오 준비 필요",
    status: "UPCOMING",
  },
  {
    scheduleId: 2,
    applicationId: 2002,
    companyName: "데이터웍스",
    scheduleType: "CODING_TEST",
    startAt: "2026-06-20T10:00:00+09:00",
    memo: "온라인 코딩테스트",
    status: "UPCOMING",
  },
];

function computeStatus(startAt) {
  return new Date(startAt) < new Date() ? "PAST" : "UPCOMING";
}

export const scheduleHandlers = [
  // PROC-02·05 — 일정 목록 (캘린더)
  http.get("*/api/schedules", ({ request }) => {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const appId = url.searchParams.get("applicationId");

    let result = mockSchedules.map((s) => ({ ...s, status: computeStatus(s.startAt) }));
    if (appId) result = result.filter((s) => String(s.applicationId) === appId);
    if (from) result = result.filter((s) => s.startAt >= from);
    if (to) result = result.filter((s) => s.startAt <= to);
    result.sort((a, b) => a.startAt.localeCompare(b.startAt));
    return ok(result);
  }),

  // PROC-01 — 일정 등록
  http.post("*/api/applications/:applicationId/schedules", async ({ params, request }) => {
    const body = await request.json();
    const appId = Number(params.applicationId);
    const job = mockJobPostings.find((j) => j.jobPostingId + 1000 === appId);
    const newSchedule = {
      scheduleId: Date.now(),
      applicationId: appId,
      companyName: job?.companyName ?? "",
      scheduleType: body.scheduleType,
      startAt: body.startAt,
      memo: body.memo ?? null,
      status: computeStatus(body.startAt),
    };
    mockSchedules.push(newSchedule);
    return HttpResponse.json(
      { success: true, data: newSchedule, error: null, timestamp: new Date().toISOString() },
      { status: 201 }
    );
  }),

  // PROC-01 — 일정 수정
  http.put("*/api/schedules/:scheduleId", async ({ params, request }) => {
    const body = await request.json();
    const idx = mockSchedules.findIndex((s) => s.scheduleId === Number(params.scheduleId));
    if (idx === -1)
      return HttpResponse.json(
        { success: false, data: null, error: { code: "SCHEDULE_NOT_FOUND", message: "일정을 찾을 수 없습니다." } },
        { status: 404 }
      );
    mockSchedules[idx] = {
      ...mockSchedules[idx],
      scheduleType: body.scheduleType ?? mockSchedules[idx].scheduleType,
      startAt: body.startAt ?? mockSchedules[idx].startAt,
      memo: body.memo ?? mockSchedules[idx].memo,
    };
    mockSchedules[idx].status = computeStatus(mockSchedules[idx].startAt);
    return ok(mockSchedules[idx]);
  }),

  // PROC-01 — 일정 삭제
  http.delete("*/api/schedules/:scheduleId", ({ params }) => {
    const idx = mockSchedules.findIndex((s) => s.scheduleId === Number(params.scheduleId));
    if (idx !== -1) mockSchedules.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
