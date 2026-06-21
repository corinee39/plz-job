"""사람인 마감일 표기 파싱.

검색 결과의 `.job_date .date` 텍스트는 '~ 07/20(월)', '오늘마감', '내일마감',
'상시채용', '채용시 마감' 등 다양한 형태로 나타난다.
"""
import re
from datetime import date, timedelta

_MD = re.compile(r"(\d{1,2})\s*/\s*(\d{1,2})")


def parse_deadline(raw: str, reference: date) -> date | None:
    """마감 표기 문자열 → 실제 마감일.

    '상시채용'/'채용시 마감' 등 마감이 없는 공고는 None.
    reference는 해당 공고를 수집한 날짜(MM/DD의 연도 경계 보정에 사용).
    """
    if not raw:
        return None
    s = raw.strip()
    if "오늘" in s:
        return reference
    if "내일" in s:
        return reference + timedelta(days=1)
    if "상시" in s or "채용시" in s or "수시" in s:
        return None
    m = _MD.search(s)
    if not m:
        return None
    month, day = int(m.group(1)), int(m.group(2))
    try:
        candidate = date(reference.year, month, day)
    except ValueError:
        return None
    # 마감월이 수집 시점보다 훨씬 이전(180일+)이면 연도 경계를 넘은 것으로 간주
    if candidate < reference - timedelta(days=180):
        candidate = candidate.replace(year=reference.year + 1)
    return candidate


def is_open(deadline_date: date | None, today: date) -> bool:
    """마감일이 없거나(상시 등) 오늘 이후면 아직 유효한 공고."""
    return deadline_date is None or deadline_date >= today
