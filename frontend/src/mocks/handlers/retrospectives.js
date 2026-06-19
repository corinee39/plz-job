import { http, HttpResponse } from "msw";
import { ok } from "../helpers.js";

// 회고 저장소 (applicationId → retrospective[])
const mockRetros = {};

export const retroHandlers = [
  http.get("/api/applications/:applicationId/retrospectives", ({ params }) => {
    const appId = Number(params.applicationId);
    return ok(mockRetros[appId] ?? []);
  }),

  http.post("/api/applications/:applicationId/retrospectives", async ({ params, request }) => {
    const body = await request.json();
    const appId = Number(params.applicationId);
    if (!mockRetros[appId]) mockRetros[appId] = [];
    const newRetro = {
      retrospectiveId: Date.now(),
      applicationId: appId,
      retrospectiveType: body.retrospectiveType,
      difficulty: body.difficulty,
      content: body.content,
      improvements: body.improvements ?? null,
      createdAt: new Date().toISOString(),
    };
    mockRetros[appId].push(newRetro);
    return HttpResponse.json(
      { success: true, data: newRetro, error: null, timestamp: new Date().toISOString() },
      { status: 201 }
    );
  }),

  http.put("/api/retrospectives/:retrospectiveId", async ({ params, request }) => {
    const body = await request.json();
    const retroId = Number(params.retrospectiveId);
    for (const appId of Object.keys(mockRetros)) {
      const idx = mockRetros[appId].findIndex((r) => r.retrospectiveId === retroId);
      if (idx !== -1) {
        mockRetros[appId][idx] = { ...mockRetros[appId][idx], ...body };
        return ok(mockRetros[appId][idx]);
      }
    }
    return HttpResponse.json(
      { success: false, data: null, error: { code: "NOT_FOUND", message: "회고를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }),

  http.delete("/api/retrospectives/:retrospectiveId", ({ params }) => {
    const retroId = Number(params.retrospectiveId);
    for (const appId of Object.keys(mockRetros)) {
      const idx = mockRetros[appId].findIndex((r) => r.retrospectiveId === retroId);
      if (idx !== -1) {
        mockRetros[appId].splice(idx, 1);
        return ok(null);
      }
    }
    return ok(null);
  }),
];
