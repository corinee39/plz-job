"""1일차 임시 probe: 승인 API를 1회 호출해 원본 응답을 etl/data/sample/에 저장한다.

목적은 Step 8 데이터 소스 정의서(§2 필드 매핑)의 '원본 필드명'을 추정이 아니라
실제 응답으로 채우는 것. 2일차의 정식 extract_sample.py / extract_api.py(타임아웃·재시도·
페이지네이션 등)와는 별개인 1회성 도구다.

선행 조건(코드 전 1회): data.go.kr 상세페이지에서 ① operation 경로, ② 파라미터명,
③ JSON 지원 여부를 확인하고 아래 SOURCES를 맞춘다. (.env 인증키는 Decoding 키 사용 —
requests가 params를 자동 URL-encode 하므로 Encoding 키를 넣으면 이중 인코딩으로 인증 실패.)

실행:  python -m etl.extract.fetch_sample
"""
import json
import xml.etree.ElementTree as ET

import requests

from etl.config import settings
from etl.common.logger import get_logger

log = get_logger("fetch_sample")
SAMPLE_DIR = settings.DATA_DIR / "sample"

# 인증 파라미터: data.go.kr와 KOSIS는 키 이름·값이 다르다.
AUTH = {
    "data_go_kr": ("serviceKey", settings.DATA_GO_KR_SERVICE_KEY),
    "kosis": ("apiKey", settings.KOSIS_API_KEY),
}

# data.go.kr/KOSIS 상세페이지에서 확인한 호출 규격(2026-06 기준).
#   - alio(1051000): JSON / mpm(1760000): XML. 단건(/detail, /getItem)은 목록 id 필요.
#   - kosis: 키만으로 되는 통합검색(statisticsSearch)으로 연결·구조 확인. 실데이터는 orgId/tblId 필요.
SOURCES = {
    "alio": {
        "auth": "data_go_kr",
        "url": f"{settings.ALIO_API_URL}/list",
        "params": {"numOfRows": 5, "pageNo": 1, "resultType": "json"},
    },
    "mpm": {
        "auth": "data_go_kr",
        "url": f"{settings.MPM_API_URL}/getList",
        "params": {"numOfRows": 5, "pageNo": 1},           # XML 전용 — 응답형식 파라미터 없음
    },
    "mpm_item": {
        "auth": "data_go_kr",
        "url": f"{settings.MPM_API_URL}/getItem",
        "params": {"idx": 6},                              # 목록 idx로 단건 조회 → 본문/URL 필드 유무 확인
    },
    "kosis": {
        "auth": "kosis",
        "url": f"{settings.KOSIS_API_URL}/statisticsSearch.do",
        "params": {"method": "getList", "searchNm": "고용", "format": "json",
                   "jsonVD": "Y", "startCount": 1, "resultCount": 5},
    },
}


def _first_record(obj):
    """응답에서 첫 레코드(dict)를 찾는다 — 래핑 구조가 API마다 다름(result[]/items.item[]/최상위 배열 등)."""
    if isinstance(obj, list):                              # KOSIS 통합검색: 최상위가 배열
        return obj[0] if obj and isinstance(obj[0], dict) else None
    if isinstance(obj, dict):
        for v in obj.values():                             # dict 리스트를 가진 첫 키
            if isinstance(v, list) and v and isinstance(v[0], dict):
                return v[0]
        for v in obj.values():                             # 없으면 더 깊이 탐색
            rec = _first_record(v)
            if rec:
                return rec
    return None


def _field_names(content: bytes, is_json: bool) -> list[str]:
    """저장한 응답에서 첫 레코드의 원본 필드명을 뽑아 표 작성용으로 보여준다."""
    try:
        if is_json:
            rec = _first_record(json.loads(content))
            return list(rec.keys()) if rec else []
        root = ET.fromstring(content)
        first = root.find(".//item")
        return [c.tag for c in first] if first is not None else []
    except Exception as e:                                  # noqa: BLE001 — 진단용, 실패해도 저장은 유효
        log.warning("필드명 파싱 실패(%s) — 저장 파일을 직접 열어 확인", type(e).__name__)
        return []


def fetch_one(name: str, cfg: dict) -> bool:
    key_param, key_val = AUTH[cfg["auth"]]
    if not cfg["url"] or cfg["url"].startswith("/"):       # base URL 미설정(.env 비어 있음)
        log.warning("[%s] base URL 미설정 — etl/.env 확인 후 재실행", name)
        return False
    if not key_val:
        log.warning("[%s] 인증키(%s) 미설정 — etl/.env 확인 후 재실행", name, cfg["auth"])
        return False
    params = {key_param: key_val, **cfg["params"]}
    r = requests.get(cfg["url"], params=params, timeout=(5, 20))
    r.raise_for_status()                                   # 인증키는 절대 로그에 남기지 않는다
    ctype = r.headers.get("Content-Type", "").lower()
    is_json = "json" in ctype or r.content.lstrip()[:1] in (b"{", b"[")  # KOSIS는 ctype이 부정확
    out = SAMPLE_DIR / f"{name}_sample.{'json' if is_json else 'xml'}"
    out.write_bytes(r.content)                             # 원본 그대로 보존
    log.info("[%s] 저장: %s (%d bytes)", name, out.name, len(r.content))
    fields = _field_names(r.content, is_json)
    if fields:
        log.info("[%s] 원본 필드명: %s", name, fields)
    return True


def main() -> None:
    SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
    ok = 0
    for name, cfg in SOURCES.items():
        try:
            ok += fetch_one(name, cfg)
        except requests.HTTPError as e:
            log.error("[%s] HTTP 오류: %s (operation 경로/파라미터/키 인코딩 확인)", name, e)
        except requests.RequestException as e:
            log.error("[%s] 요청 실패: %s", name, type(e).__name__)
    log.info("샘플 저장 완료: %d/%d개 (위치 %s)", ok, len(SOURCES), SAMPLE_DIR)


if __name__ == "__main__":
    main()
