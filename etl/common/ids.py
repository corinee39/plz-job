"""공고 고유 식별자 생성(플랜 §4.1): 외부 ID 우선, 없으면 URL 해시."""
import hashlib
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

from etl.common.exceptions import ExtractError

_TRACKING = {"utm_source", "utm_medium", "utm_campaign",
             "utm_term", "utm_content", "gclid", "fbclid"}


def normalize_url(url: str) -> str:
    """추적 파라미터 제거 + 소문자/끝슬래시 정리 후 정규형 반환."""
    p = urlsplit(url.strip())
    query = [(k, v) for k, v in parse_qsl(p.query) if k.lower() not in _TRACKING]
    return urlunsplit((p.scheme.lower(), p.netloc.lower(),
                       p.path.rstrip("/"), urlencode(sorted(query)), ""))


def make_external_id(source: str, external_id=None, url: str | None = None) -> str:
    """외부 ID가 있으면 문자열로, 없으면 정규화 URL의 SHA-256(앞 16자)."""
    if external_id not in (None, "", 0):
        return str(external_id)
    if url:
        h = hashlib.sha256(normalize_url(url).encode("utf-8")).hexdigest()
        return f"url:{h[:16]}"
    raise ExtractError(f"{source}: external_id·url 둘 다 없음 — 식별 불가")