"""HDFS Raw(로컬 백업)를 읽어 표준 필드로 매핑. 소스별 매핑 + mpm 단건 병합."""
import xml.etree.ElementTree as ET

from etl.config import settings
from etl.common.text import clean_text
from etl.extract.sources import SOURCES

RAW_DIR = settings.DATA_DIR / "raw"

# 원본 필드 → 표준 필드 (1일차 data_source_spec.md 확정)
FIELD_MAP = {
    "alio": lambda r: {
        "company_name": r.get("instNm"),
        "title": r.get("recrutPbancTtl"),
        "url": r.get("srcUrl"),
        "external_raw_id": r.get("recrutPblntSn"),
        "position_raw": r.get("ncsCdNmLst"),
        "region_raw": r.get("workRgnNmLst"),
        "posted_date_raw": r.get("pbancBgngYmd"),
        "deadline_raw": r.get("pbancEndYmd"),
        "description": " ".join(clean_text(r.get(k)) for k in
                                ("aplyQlfcCn", "prefCn", "scrnprcdrMthdExpln")),
    },
    "mpm": lambda r: {
        "company_name": r.get("insttname"),
        "title": r.get("title"),
        "url": r.get("link01") or "",
        "external_raw_id": r.get("idx"),
        "position_raw": r.get("type01"),
        "region_raw": r.get("areacode"),
        "posted_date_raw": r.get("begindate") or r.get("regdate"),
        "deadline_raw": r.get("enddate"),
        "description": clean_text(r.get("contents")),
    },
}


def _read_mpm_items(base):
    """item_*.xml(단건)을 idx→dict로. 본문(contents)·URL(link) 포함."""
    out = {}
    for f in base.glob("item_*.xml"):
        item = ET.fromstring(f.read_bytes()).find(".//item")
        if item is not None:
            d = {c.tag: c.text for c in item}
            out[str(d.get("idx"))] = d
    return out


def read_records(source: str, collected_date: str) -> list:
    cfg = SOURCES[source]
    base = RAW_DIR / source / f"collected_date={collected_date}"
    if not base.exists():
        raise FileNotFoundError(f"raw 없음: {base} (2일차 extract 먼저 실행)")

    records = []
    for f in sorted(base.glob(f"page_*.{cfg['ext']}")):
        items, _ = cfg["parse"](f.read_bytes())          # sources.py 파서 재사용
        records.extend(items)

    if cfg.get("detail"):                                 # mpm: 단건 병합
        details = _read_mpm_items(base)
        for r in records:
            d = details.get(str(r.get(cfg["id_field"])))
            if d:
                r.update(d)                               # contents·link01 등 채움

    return [FIELD_MAP[source](r) for r in records]