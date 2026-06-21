"""크롤링 공고에 기술 스택 / 지역 / 직무를 태깅.

dict CSV(data/dict/*.csv)를 재사용한다:
- tech_stack_dict.csv : stack_name, keyword  (키워드 매칭 → 표준 스택명)
- region_map.csv      : alias, sido, sigungu (지역 별칭 → 표준 시·도)
- position_map.csv    : keyword, position    (키워드 → 표준 직무)
"""
import re
from datetime import date
from pathlib import Path

import pandas as pd

from common.dates import is_open, parse_deadline
from common.logger import get_logger

log = get_logger("transform.enrich")

DICT_DIR = Path(__file__).resolve().parents[1] / "data" / "dict"


def _load_stack_dict() -> list[tuple[str, str, re.Pattern]]:
    """(stack_name, keyword, 컴파일된 경계 매칭 정규식) 리스트.

    영숫자로 시작/끝나는 키워드는 단어 경계(\\b 유사)를 적용해 오탐을 줄인다.
    (예: 'go'가 'golang'/'category'에 잘못 걸리지 않도록)
    한글/기호 키워드는 단순 부분 문자열 매칭.
    """
    df = pd.read_csv(DICT_DIR / "tech_stack_dict.csv")
    out = []
    for stack, kw in zip(df["stack_name"], df["keyword"]):
        kw_l = str(kw).strip().lower()
        if not kw_l:
            continue
        esc = re.escape(kw_l)
        left = r"(?<![a-z0-9])" if kw_l[0].isalnum() else ""
        right = r"(?![a-z0-9])" if kw_l[-1].isalnum() else ""
        pat = re.compile(left + esc + right)
        out.append((str(stack), kw_l, pat))
    return out


def _load_region_map() -> list[tuple[str, str]]:
    """(alias, sido) 리스트. 긴 alias 우선 매칭하도록 길이 내림차순 정렬."""
    df = pd.read_csv(DICT_DIR / "region_map.csv").fillna("")
    pairs = [(str(a).strip(), str(s).strip())
             for a, s in zip(df["alias"], df["sido"]) if str(a).strip()]
    pairs.sort(key=lambda x: len(x[0]), reverse=True)
    return pairs


def _load_position_map() -> list[tuple[str, str]]:
    df = pd.read_csv(DICT_DIR / "position_map.csv")
    return [(str(k).strip().lower(), str(p).strip())
            for k, p in zip(df["keyword"], df["position"]) if str(k).strip()]


def _match_stacks(text: str, sector_keywords: list[str],
                  stack_dict) -> list[str]:
    """제목 + sector 키워드 텍스트에서 표준 스택명 집합 추출."""
    haystack = (text + " " + " ".join(sector_keywords)).lower()
    found = []
    for stack, _kw, pat in stack_dict:
        if pat.search(haystack):
            found.append(stack)
    return sorted(set(found))


def _match_region(location_raw: str, region_pairs) -> str:
    """'서울 강남구' 같은 지역 문자열 → 표준 시·도. 미매칭 시 '기타'."""
    if not location_raw:
        return "기타"
    for alias, sido in region_pairs:
        if alias and alias in location_raw:
            return sido
    return "기타"


def _match_position(search_keyword: str, title: str, pos_pairs) -> str:
    """검색 키워드 우선, 없으면 제목에서 직무 분류. 미매칭 시 '기타'."""
    hay = (search_keyword + " " + title).lower()
    for kw, pos in pos_pairs:
        if kw and kw in hay:
            return pos
    return "기타"


def enrich(rows: list[dict]) -> pd.DataFrame:
    """크롤링 row dict 리스트 → 스택/지역/직무/마감 태깅된 DataFrame.

    stacks 컬럼은 '|' 구분 문자열로 저장(분석 단계에서 explode).
    deadline_date/is_open은 마감일 파싱 결과로, "현재 유효한 공고"
    필터링에 쓰인다(누적 데이터에는 이미 마감된 공고가 섞여 있을 수 있음).
    """
    if not rows:
        log.warning("입력 공고가 비어 있음")
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    for col in ("sector_keywords", "deadline", "collected_date"):
        if col not in df.columns:
            df[col] = ""
        df[col] = df[col].fillna("")

    stack_dict = _load_stack_dict()
    region_pairs = _load_region_map()
    pos_pairs = _load_position_map()
    today = date.today()

    stacks_col, region_col, pos_col = [], [], []
    deadline_col, open_col = [], []
    for _, r in df.iterrows():
        sector_kws = [s for s in str(r["sector_keywords"]).split("|") if s]
        stacks = _match_stacks(str(r["title"]), sector_kws, stack_dict)
        stacks_col.append("|".join(stacks))
        region_col.append(_match_region(str(r["location_raw"]), region_pairs))
        pos_col.append(_match_position(str(r["search_keyword"]),
                                       str(r["title"]), pos_pairs))

        try:
            collected = date.fromisoformat(str(r["collected_date"]))
        except ValueError:
            collected = today
        dd = parse_deadline(str(r["deadline"]), collected)
        deadline_col.append(dd.isoformat() if dd else "")
        open_col.append(is_open(dd, today))

    df["stacks"] = stacks_col
    df["region"] = region_col
    df["position"] = pos_col
    df["deadline_date"] = deadline_col
    df["is_open"] = open_col

    n_with_stack = (df["stacks"] != "").sum()
    n_open = int(df["is_open"].sum())
    log.info("enrich 완료: %d건 (스택 태깅 %d건, 유효 공고 %d건)",
             len(df), n_with_stack, n_open)
    return df
