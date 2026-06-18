"""저장된 raw/sample 파일을 동일 인터페이스로 재생(승인 지연·장애 대비)."""
from pathlib import Path

from etl.config import settings
from etl.common.ids import make_external_id
from etl.common.logger import get_logger
from etl.extract.sources import SOURCES

log = get_logger("extract_sample")


def extract_from_files(source: str, paths: list) -> dict:
    cfg = SOURCES[source]
    records = 0
    seen: set[str] = set()
    for p in paths:
        items, _ = cfg["parse"](Path(p).read_bytes())
        for it in items:
            url = it.get(cfg["url_field"]) if cfg["url_field"] else None
            seen.add(f"{source}:{make_external_id(source, it.get(cfg['id_field']), url)}")
        records += len(items)
        log.info("[%s] %s: %d건", source, Path(p).name, len(items))
    meta = {"source": source, "records": records, "unique": len(seen)}
    log.info("[%s] 재생 메타: %s", source, meta)
    return meta


if __name__ == "__main__":
    sd = settings.DATA_DIR / "sample"
    extract_from_files("alio", [sd / "alio_sample.json"])
    extract_from_files("mpm", [sd / "mpm_sample.xml"])