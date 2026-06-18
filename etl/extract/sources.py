"""소스별 호출 규격 + 파싱(원본 필드 보존). 1일차 탐사 결과 반영."""
import json
import xml.etree.ElementTree as ET

from etl.config import settings


def _alio_params(page: int) -> dict:
    return {"serviceKey": settings.DATA_GO_KR_SERVICE_KEY, "resultType": "json",
            "pageNo": page, "numOfRows": settings.EXTRACT_NUM_ROWS}


def _alio_parse(content: bytes):
    """alio(JSON): (레코드 리스트, 전체 건수)."""
    obj = json.loads(content)
    return obj.get("result", []) or [], int(obj.get("totalCount", 0) or 0)


def _mpm_params(page: int) -> dict:
    return {"serviceKey": settings.DATA_GO_KR_SERVICE_KEY,
            "pageNo": page, "numOfRows": settings.EXTRACT_NUM_ROWS}


def _mpm_parse(content: bytes):
    """mpm(XML): item의 자식 태그를 dict로. (레코드 리스트, 전체 건수)."""
    root = ET.fromstring(content)
    records = [{c.tag: c.text for c in item} for item in root.findall(".//item")]
    total_el = root.find(".//totalCount")
    return records, int(total_el.text) if total_el is not None else len(records)


def _mpm_item_parse(content: bytes) -> dict:
    """mpm 단건(getItem): body.item을 dict로(contents·link 포함)."""
    item = ET.fromstring(content).find(".//item")
    return {c.tag: c.text for c in item} if item is not None else {}


SOURCES = {
    "alio": {"url": f"{settings.ALIO_API_URL}/list", "ext": "json",
             "id_field": "recrutPblntSn", "url_field": "srcUrl",
             "build_params": _alio_params, "parse": _alio_parse,
             "detail": None},                              # 목록에 본문(aplyQlfcCn) 있음 → 단건 불필요
    "mpm": {"url": f"{settings.MPM_API_URL}/getList", "ext": "xml",
            "id_field": "idx", "url_field": None,
            "build_params": _mpm_params, "parse": _mpm_parse,
            "detail": {"url": f"{settings.MPM_API_URL}/getItem", "id_param": "idx",
                       "body_field": "contents", "parse": _mpm_item_parse}},
}