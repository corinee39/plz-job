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


def _saramin_params(page: int) -> dict:
    """사람인(JSON): IT개발·데이터(job_mid_cd=22) 최신순. start는 0기반."""
    return {"access-key": settings.SARAMIN_ACCESS_KEY,
            "job_mid_cd": settings.SARAMIN_JOB_MID_CD,
            "fields": "posting-date+expiration-date+keyword",  # keyword=기술스택 태그
            "sort": "pd", "count": settings.EXTRACT_NUM_ROWS, "start": page - 1}


def _saramin_parse(content: bytes):
    """사람인(JSON): (공고 리스트, 전체 건수). jobs.job은 단건이면 dict일 수 있음."""
    jobs = (json.loads(content).get("jobs") or {})
    job = jobs.get("job") or []
    records = job if isinstance(job, list) else [job]
    return records, int(jobs.get("total", 0) or 0)


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
    "saramin": {"url": f"{settings.SARAMIN_API_URL}/job-search", "ext": "json",
                "id_field": "id", "url_field": "url",
                "headers": {"Accept": "application/json"},      # 없으면 XML 응답
                "build_params": _saramin_params, "parse": _saramin_parse,
                "detail": None},                                # keyword가 목록에 있음 → 단건 불필요
}