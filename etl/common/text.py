"""문자열·날짜 정제 공통 함수(3일차 Transform)."""
import re
from datetime import datetime

_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")
_ENTITY = {"&lt;": "<", "&gt;": ">", "&amp;": "&",
           "&quot;": '"', "&#xD;": " ", "&nbsp;": " "}


def clean_text(s) -> str:
    """HTML 엔티티 복원 → 태그 제거 → 공백 정리. None은 ''."""
    if not s:
        return ""
    for k, v in _ENTITY.items():
        s = s.replace(k, v)
    s = _TAG.sub(" ", s)
    return _WS.sub(" ", s).strip()


def to_iso_date(s):
    """'YYYYMMDD'·'YYYY-MM-DD' 등 → 'YYYY-MM-DD'. 실패 시 None."""
    if not s:
        return None
    raw = str(s).strip()
    for fmt in ("%Y%m%d", "%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None