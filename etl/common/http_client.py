"""외부 GET 공통 래퍼: 타임아웃·재시도·상태검사. 인증키는 로그 금지."""
import time

import requests

from etl.config import settings
from etl.common.logger import get_logger
from etl.common.exceptions import ExtractError

log = get_logger("http")


def get(url: str, params: dict, headers: dict | None = None) -> requests.Response:
    timeout = (settings.HTTP_TIMEOUT_CONNECT, settings.HTTP_TIMEOUT_READ)
    last = None
    for attempt in range(1, settings.HTTP_MAX_RETRIES + 1):
        try:
            r = requests.get(url, params=params, headers=headers, timeout=timeout)
            if r.status_code == 200:
                return r
            last = f"HTTP {r.status_code}"
        except requests.RequestException as e:
            last = type(e).__name__               # 메시지에 URL/키가 섞일 수 있어 타입만
        if attempt < settings.HTTP_MAX_RETRIES:
            wait = settings.HTTP_BACKOFF * attempt
            log.warning("재시도 %d/%d (%s) — %.1fs 대기", attempt, settings.HTTP_MAX_RETRIES, last, wait)
            time.sleep(wait)
    raise ExtractError(f"요청 실패: {url} ({last})")   # url만, params(키) 제외