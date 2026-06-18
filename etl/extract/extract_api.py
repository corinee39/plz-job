"""승인 API 수집 → 원본 raw를 HDFS Raw 파티션에 보관(에러 격리 + 메타 집계).

mpm처럼 목록에 본문이 없는 소스는 목록 적재 후 idx별 getItem(단건)을
2단계로 수집해 본문(contents)·URL(link)을 확보한다(기술 스택 추출용, 3일차).
"""
import sys
from datetime import date, datetime

from etl.config import settings
from etl.common import hdfs_client
from etl.common.http_client import get
from etl.common.ids import make_external_id
from etl.common.logger import get_logger
from etl.common.exceptions import ExtractError
from etl.extract.sources import SOURCES

log = get_logger("extract_api")
RAW_DIR = settings.DATA_DIR / "raw"


def _isolate_error(source: str, tag: str, msg: str) -> None:
    """실패(페이지 `p{n}`/단건 `item{idx}`)를 error 파티션에 기록하고 계속 진행한다."""
    rdir = f"{settings.HDFS_ROOT}/error/run_date={date.today().isoformat()}"
    hdfs_client.mkdir(rdir)
    stamp = datetime.now().strftime("%H%M%S")
    hdfs_client.write_text(f"{rdir}/{source}_{tag}_{stamp}.txt",
                           f"source={source} {tag}\n{msg}\n")
    log.error("[%s] %s 격리: %s", source, tag, msg)


def _save_raw(content: bytes, local_dir, remote_dir, fname: str) -> None:
    """원본 응답을 로컬 백업 + HDFS Raw에 변형 없이 저장."""
    local = local_dir / fname
    local.write_bytes(content)                              # 로컬 백업(시연용 §13)
    hdfs_client.upload(str(local), f"{remote_dir}/{fname}")  # HDFS Raw 적재


def _collect_details(source, cfg, ids, local_dir, remote_dir):
    """idx별 getItem(단건)으로 본문·URL 확보. 호출량은 EXTRACT_MAX_DETAILS로 제한."""
    d = cfg["detail"]
    fetched = errors = 0
    for idx in ids[: settings.EXTRACT_MAX_DETAILS]:
        params = {"serviceKey": settings.DATA_GO_KR_SERVICE_KEY, d["id_param"]: idx}
        try:
            resp = get(d["url"], params)
            rec = d["parse"](resp.content)
        except (ExtractError, ValueError) as e:
            errors += 1
            _isolate_error(source, f"item{idx}", str(e))
            continue
        if not rec:
            continue
        _save_raw(resp.content, local_dir, remote_dir, f"item_{idx}.{cfg['ext']}")
        fetched += 1
        body = (rec.get(d["body_field"]) or "").strip()
        log.info("[%s] getItem idx=%s: 본문 %d자", source, idx, len(body))
    return fetched, errors


def extract(source: str, collected_date: str | None = None) -> dict:
    cfg = SOURCES[source]
    collected_date = collected_date or date.today().isoformat()
    local_dir = RAW_DIR / source / f"collected_date={collected_date}"
    local_dir.mkdir(parents=True, exist_ok=True)
    remote_dir = (f"{settings.HDFS_ROOT}/raw/source={source}"
                  f"/collected_date={collected_date}")
    hdfs_client.mkdir(remote_dir)

    pages = records = errors = 0
    seen: set[str] = set()
    ids: list = []                                          # 2단계(getItem)용 idx 수집
    for page in range(1, settings.EXTRACT_MAX_PAGES + 1):
        try:
            resp = get(cfg["url"], cfg["build_params"](page), cfg.get("headers"))
            items, total = cfg["parse"](resp.content)
        except (ExtractError, ValueError) as e:             # 호출/파싱 실패 격리
            errors += 1
            _isolate_error(source, f"p{page}", str(e))
            continue
        if not items:                                       # 빈 응답 = 끝
            break
        _save_raw(resp.content, local_dir, remote_dir, f"page_{page:03d}.{cfg['ext']}")
        for it in items:                                    # 멱등 식별자 + idx 수집
            raw_id = it.get(cfg["id_field"])
            url = it.get(cfg["url_field"]) if cfg["url_field"] else None
            seen.add(f"{source}:{make_external_id(source, raw_id, url)}")
            ids.append(raw_id)
        pages += 1
        records += len(items)
        log.info("[%s] page %d: %d건 적재 (누적 %d/%s)", source, page, len(items), records, total)
        if total and page * settings.EXTRACT_NUM_ROWS >= total:
            break

    details = detail_errors = 0
    if cfg.get("detail") and ids:                           # 목록에 본문 없는 소스만 2단계
        details, detail_errors = _collect_details(source, cfg, ids, local_dir, remote_dir)

    meta = {"source": source, "collected_date": collected_date, "pages": pages,
            "records": records, "unique": len(seen),
            "details": details, "errors": errors + detail_errors}
    log.info("[%s] 수집 완료 메타: %s", source, meta)          # 키·비밀번호는 없음
    return meta


if __name__ == "__main__":
    extract(sys.argv[1] if len(sys.argv) > 1 else settings.DATA_SOURCE)