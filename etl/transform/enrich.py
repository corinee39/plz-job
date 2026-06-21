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

from common.dates import is_open, parse_deadline, parse_posted_date
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


def _load_region_map() -> list[tuple[str, str, str]]:
    """(alias, sido, sigungu) 리스트. 긴 alias 우선 매칭하도록 길이 내림차순 정렬."""
    df = pd.read_csv(DICT_DIR / "region_map.csv").fillna("")
    triples = [(str(a).strip(), str(s).strip(), str(g).strip())
               for a, s, g in zip(df["alias"], df["sido"], df["sigungu"])
               if str(a).strip()]
    triples.sort(key=lambda x: len(x[0]), reverse=True)
    return triples


def _load_position_map() -> list[tuple[str, str]]:
    df = pd.read_csv(DICT_DIR / "position_map.csv")
    return [(str(k).strip().lower(), str(p).strip())
            for k, p in zip(df["keyword"], df["position"]) if str(k).strip()]


def _match_stacks(text: str, sector_keywords: list[str],
                  stack_dict) -> list[tuple[str, str]]:
    """제목 + sector 키워드 텍스트에서 (표준 스택명, 매칭 키워드) 추출.

    한 스택이 여러 키워드에 걸리면 처음 매칭된 키워드를 보존한다.
    스택명 오름차순으로 정렬해 반환(stacks 컬럼 순서 안정화).
    """
    haystack = (text + " " + " ".join(sector_keywords)).lower()
    matched: dict[str, str] = {}
    for stack, kw, pat in stack_dict:
        if stack not in matched and pat.search(haystack):
            matched[stack] = kw
    return sorted(matched.items())


def _match_region(location_raw: str, region_triples) -> tuple[str, str]:
    """'서울 강남구' 같은 지역 문자열 → (표준 시·도, 시·군·구). 미매칭 시 ('기타','').

    사전에 시·군·구가 지정된 별칭(예: 판교→분당구)은 그 값을 쓰고,
    없으면 시·도 별칭을 제거한 나머지를 시·군·구로 본다(예: '서울 강남구'→'강남구').
    """
    if not location_raw:
        return "기타", ""
    for alias, sido, sigungu in region_triples:
        if alias and alias in location_raw:
            if sigungu:
                return sido, sigungu
            rest = location_raw.replace(alias, "", 1).strip()
            return sido, rest
    return "기타", ""


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
    for col in ("sector_keywords", "deadline", "posted_raw",
                "location_raw", "collected_date"):
        if col not in df.columns:
            df[col] = ""
        df[col] = df[col].fillna("")

    stack_dict = _load_stack_dict()
    region_triples = _load_region_map()
    pos_pairs = _load_position_map()
    today = date.today()

    stacks_col, stack_kw_col, region_col, sigungu_col, pos_col = [], [], [], [], []
    deadline_col, posted_col, open_col = [], [], []
    for _, r in df.iterrows():
        sector_kws = [s for s in str(r["sector_keywords"]).split("|") if s]
        pairs = _match_stacks(str(r["title"]), sector_kws, stack_dict)
        stacks_col.append("|".join(s for s, _ in pairs))
        stack_kw_col.append("|".join(kw for _, kw in pairs))
        sido, sigungu = _match_region(str(r["location_raw"]), region_triples)
        region_col.append(sido)
        sigungu_col.append(sigungu)
        pos_col.append(_match_position(str(r["search_keyword"]),
                                       str(r["title"]), pos_pairs))

        try:
            collected = date.fromisoformat(str(r["collected_date"]))
        except ValueError:
            collected = today
        dd = parse_deadline(str(r["deadline"]), collected)
        deadline_col.append(dd.isoformat() if dd else "")
        pd_ = parse_posted_date(str(r["posted_raw"]))
        posted_col.append(pd_.isoformat() if pd_ else "")
        open_col.append(is_open(dd, today))

    df["stacks"] = stacks_col
    df["stack_keywords"] = stack_kw_col
    df["region"] = region_col
    df["sigungu"] = sigungu_col
    df["position"] = pos_col
    df["deadline_date"] = deadline_col
    df["posted_date"] = posted_col
    df["is_open"] = open_col

    n_with_stack = (df["stacks"] != "").sum()
    n_open = int(df["is_open"].sum())
    log.info("enrich 완료: %d건 (스택 태깅 %d건, 유효 공고 %d건)",
             len(df), n_with_stack, n_open)
    return df
