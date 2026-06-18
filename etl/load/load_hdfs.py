"""로컬 보유 파일(etl/data/raw/<source>/*)을 HDFS Raw 파티션에 업로드."""
from datetime import date

from etl.config import settings
from etl.common import hdfs_client
from etl.common.logger import get_logger

log = get_logger("load_hdfs")


def upload_raw(collected_date: str | None = None) -> int:
    collected_date = collected_date or date.today().isoformat()
    src_root = settings.DATA_DIR / "raw"
    count = 0
    for source_dir in sorted(src_root.iterdir()):
        if not source_dir.is_dir():
            continue
        source = source_dir.name                          # 폴더 이름 = source 파티션 키 (seoul / work24 ...)
        files = [f for f in source_dir.iterdir()
                 if f.is_file() and f.name != ".gitkeep"]
        if not files:                                     # 빈 폴더(alio/mpm/kosis 등)는 건너뜀
            continue
        remote_dir = (
            f"{settings.HDFS_ROOT}/raw/source={source}"
            f"/collected_date={collected_date}"
        )
        hdfs_client.mkdir(remote_dir)
        for f in files:
            hdfs_client.upload(str(f), f"{remote_dir}/{f.name}")
            log.info("적재: %s -> %s/%s", f.name, remote_dir, f.name)
            count += 1
    log.info("총 %d개 파일 적재 완료 (collected_date=%s)", count, collected_date)
    return count


if __name__ == "__main__":
    upload_raw()