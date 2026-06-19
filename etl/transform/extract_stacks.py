"""공고 본문에서 기술 스택 추출(사전·동의어·경계 매칭) → 공고×스택 다대다."""
import csv
import re

import pandas as pd

from etl.config import settings
from etl.common.logger import get_logger

log = get_logger("stacks")
DICT_DIR = settings.DATA_DIR / "dict"

# 더 구체적인 스택에 '흡수'되어야 하는 키워드의 부정형 경계.
#  - 'spring'이 'spring boot'의 일부일 땐 Spring으로 잡지 않는다(Spring ↔ Spring Boot 엄격 분리).
#    단독 'Spring'/'Spring Security' 등은 그대로 Spring으로 매칭된다.
_NEG_LOOKAHEAD = {"spring": r"(?!\s*boot)"}


def _load_rules():
    """(표준명, 키워드, 경계 정규식) 목록."""
    rules = []
    with open(DICT_DIR / "tech_stack_dict.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            kw = row["keyword"].strip()
            if kw:
                neg = _NEG_LOOKAHEAD.get(kw.lower(), "")
                pat = re.compile(rf"(?<![A-Za-z0-9]){re.escape(kw)}(?![A-Za-z0-9]){neg}", re.I)
                rules.append((row["stack_name"].strip(), kw, pat))
    return rules


def extract_stacks(postings: pd.DataFrame) -> pd.DataFrame:
    rules = _load_rules()
    rows = []
    for _, p in postings.iterrows():
        text = f"{p['title']} {p['description']}"
        seen = set()
        for stack, kw, pat in rules:
            if stack not in seen and pat.search(text):
                seen.add(stack)
                rows.append({"source": p["source"], "external_id": p["external_id"],
                             "stack_name": stack, "matched_keyword": kw})
    out = pd.DataFrame(rows, columns=["source", "external_id", "stack_name", "matched_keyword"])
    uniq = out["external_id"].nunique() if len(out) else 0
    log.info("기술 스택: 공고 %d개 → 스택행 %d개(스택 보유 고유 공고 %d개)", len(postings), len(out), uniq)
    return out