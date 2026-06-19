"""표준 레코드 → 공고 표준 스키마 DataFrame(지역·직무 표준화 + 중복 제거)."""
import csv
import re

import pandas as pd

from etl.config import settings
from etl.common.text import clean_text, to_iso_date
from etl.common.ids import make_external_id
from etl.common.logger import get_logger

log = get_logger("normalize")
DICT_DIR = settings.DATA_DIR / "dict"


def _load_region_map():
    """region_map.csv → (시·도 별칭 dict, 시·군·구 별칭 dict)."""
    sido, sigungu = {}, {}
    with open(DICT_DIR / "region_map.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            alias = row["alias"].strip()
            sd = (row.get("sido") or "").strip()
            sg = (row.get("sigungu") or "").strip()
            if alias and sd:
                sido[alias] = sd
            if alias and sg:
                sigungu[alias] = sg
    return sido, sigungu


def _load_position_rules():
    """키워드를 경계(boundary) 정규식으로 컴파일 — 부분문자열 오탐 축소."""
    rules = []
    with open(DICT_DIR / "position_map.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            kw = row["keyword"].strip()
            if kw:
                pat = re.compile(rf"(?<![A-Za-z0-9]){re.escape(kw)}(?![A-Za-z0-9])", re.I)
                rules.append((pat, row["position"].strip()))
    return rules


def _first_sido(region_raw, region_map):
    if not region_raw:
        return "미분류"
    token = region_raw.replace(",", " ").split()[0]       # "대구,경북" → "대구"
    return region_map.get(token, "미분류")


def _sigungu(region_raw, sigungu_map):
    """region_raw의 '>' 뒤를 시·군·구로 추출. 별칭은 매핑 보정, 없으면 가장 구체적(뒤) 토큰."""
    if not region_raw or ">" not in region_raw:
        return ""
    part = region_raw.split(">", 1)[1].strip()            # "서울 > 강남구" → "강남구"
    if not part:
        return ""
    if part in sigungu_map:                               # 전체 표기 별칭(예: 성남시 분당구)
        return sigungu_map[part]
    tokens = part.replace(",", " ").split()
    for t in reversed(tokens):                            # 별칭 토큰(예: 판교) 우선 보정
        if t in sigungu_map:
            return sigungu_map[t]
    return tokens[-1] if tokens else ""                   # 매핑 없으면 원본 시·군·구 사용


def _classify_position(text, rules):
    for pat, pos in rules:
        if pat.search(text or ""):
            return pos
    return "기타"


def normalize(source: str, records: list, base_date: str) -> pd.DataFrame:
    sido_map, sigungu_map = _load_region_map()
    pos_rules = _load_position_rules()

    rows = []
    for r in records:
        region_raw = clean_text(r.get("region_raw"))
        title = clean_text(r.get("title"))
        position_raw = clean_text(r.get("position_raw"))
        description = r.get("description") or ""
        rows.append({
            "source": source,
            "external_id": make_external_id(source, r.get("external_raw_id"), r.get("url")),
            "company_name": clean_text(r.get("company_name")),
            "title": title,
            "url": r.get("url") or "",
            "position_raw": position_raw,
            "position": _classify_position(f"{title} {position_raw} {description}", pos_rules),
            "region_raw": region_raw,
            "sido": _first_sido(region_raw, sido_map),
            "sigungu": _sigungu(region_raw, sigungu_map),
            "posted_date": to_iso_date(r.get("posted_date_raw")),
            "posted_date_raw": r.get("posted_date_raw"),
            "deadline": to_iso_date(r.get("deadline_raw")),
            "description": description,
            "base_date": base_date,
        })

    df = pd.DataFrame(rows)
    before = len(df)
    df = df.drop_duplicates(subset=["source", "external_id"]).reset_index(drop=True)
    log.info("[%s] 정규화 %d건 → 중복 제거 후 %d건", source, before, len(df))
    return df