import { http, HttpResponse } from "msw";
import { ok } from "../helpers.js";

// PROC-03·04 — 회고 저장소 (API 명세서 §4.4 기준)
// 응답 필드: retrospectiveId, type, difficulty, content, improvement, createdAt
const mockRetros = {};

export const retroHandlers = [
  // PROC-04 — 회고 목록
  http.get("*/api/applications/:applicationId/retrospectives", ({ params }) => {
    const appId = Number(params.applicationId);
    return ok(mockRetros[appId] ?? []);
  }),

  // PROC-03 — 회고 작성
  http.post("*/api/applications/:applicationId/retrospectives", async ({ params, request }) => {
    const body = await request.json();
    const appId = Number(params.applicationId);
    if (!mockRetros[appId]) mockRetros[appId] = [];
    const newRetro = {
      retrospectiveId: Date.now(),
      applicationId: appId,
      type: body.type,
      difficulty: body.difficulty ?? null,
      content: body.content,
      improvement: body.improvement ?? null,
      createdAt: new Date().toISOString(),
    };
    mockRetros[appId].push(newRetro);
    return HttpResponse.json(
      { success: true, data: newRetro, error: null, timestamp: new Date().toISOString() },
      { status: 201 }
    );
  }),

  // PROC-03 — 회고 수정
  http.put("*/api/retrospectives/:retrospectiveId", async ({ params, request }) => {
    const body = await request.json();
    const retroId = Number(params.retrospectiveId);
    for (const appId of Object.keys(mockRetros)) {
      const idx = mockRetros[appId].findIndex((r) => r.retrospectiveId === retroId);
      if (idx !== -1) {
        mockRetros[appId][idx] = {
          ...mockRetros[appId][idx],
          type: body.type ?? mockRetros[appId][idx].type,
          difficulty: body.difficulty ?? mockRetros[appId][idx].difficulty,
          content: body.content ?? mockRetros[appId][idx].content,
          improvement: body.improvement ?? mockRetros[appId][idx].improvement,
        };
        return ok(mockRetros[appId][idx]);
      }
    }
    return HttpResponse.json(
      { success: false, data: null, error: { code: "RETROSPECTIVE_NOT_FOUND", message: "회고를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }),

  // PROC-03 — 회고 삭제
  http.delete("*/api/retrospectives/:retrospectiveId", ({ params }) => {
    const retroId = Number(params.retrospectiveId);
    for (const appId of Object.keys(mockRetros)) {
      const idx = mockRetros[appId].findIndex((r) => r.retrospectiveId === retroId);
      if (idx !== -1) {
        mockRetros[appId].splice(idx, 1);
        return new HttpResponse(null, { status: 204 });
      }
    }
    return new HttpResponse(null, { status: 204 });
  }),
];
