import { http } from "msw";
import { ok } from "../helpers.js";

export const dashboardHandlers = [
  http.get("/api/dashboard/summary", () =>
    ok({
      monthlyApplications: 2,
      inProgress: 1,
      upcomingSchedules: 2,
      finalPassCount: 0,
    })
  ),
];
