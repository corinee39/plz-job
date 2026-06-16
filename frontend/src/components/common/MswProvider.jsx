import { useEffect, useState } from "react";

/**
 * 백엔드(Spring Boot)가 준비되기 전까지만 사용하는 임시 MSW 부트스트랩.
 * VITE_API_MOCKING=enabled 일 때만 동작하며, 실서버 연동 시 제거한다.
 */
export function MswProvider({ children }) {
  const [ready, setReady] = useState(import.meta.env.VITE_API_MOCKING !== "enabled");

  useEffect(() => {
    if (import.meta.env.VITE_API_MOCKING !== "enabled") return;

    import("../../mocks/browser").then(({ worker }) => {
      worker.start({ onUnhandledRequest: "bypass" }).then(() => setReady(true));
    });
  }, []);

  if (!ready) return null;
  return children;
}
