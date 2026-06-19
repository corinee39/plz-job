import { HttpResponse } from "msw";

// §11 공통 응답 봉투
export function ok(data) {
  return HttpResponse.json({
    success: true,
    data,
    error: null,
    timestamp: new Date().toISOString(),
  });
}
