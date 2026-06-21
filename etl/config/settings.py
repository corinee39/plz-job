"""환경 설정 로더. 모든 비밀/연결 정보는 여기서 읽는다.

`etl/.env`(python-dotenv)에서 Oracle·HDFS 접속 정보를 읽어 모듈 상수로 노출한다.
연결 정보가 빠진 채 적재를 시도하면 원인을 알기 어려우므로 `_req()`로 필수
키를 즉시 검증한다.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

ETL_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ETL_DIR / "data"

load_dotenv(ETL_DIR / ".env")


def _req(key: str) -> str:
    """필수 환경변수. 없으면 명확한 에러로 즉시 실패."""
    val = os.getenv(key)
    if not val:
        raise RuntimeError(f"필수 환경변수 {key} 가 .env 에 없습니다.")
    return val


# ── Oracle ──
ORACLE_USER = os.getenv("ORACLE_USER", "")
ORACLE_PASSWORD = os.getenv("ORACLE_PASSWORD", "")
# oracledb thin 모드 DSN: host:port/service
ORACLE_DSN = (
    f"{os.getenv('ORACLE_HOST', 'localhost')}"
    f":{os.getenv('ORACLE_PORT', '1522')}"
    f"/{os.getenv('ORACLE_SERVICE', 'XEPDB1')}"
)

# ── HDFS (WebHDFS) ──
HDFS_WEBHDFS_URL = os.getenv("HDFS_WEBHDFS_URL", "")
HDFS_USER = os.getenv("HDFS_USER", "")
HDFS_ROOT = os.getenv("HDFS_ROOT", "/plz-job")

# ── 데이터 소스 스위치 ──
DATA_SOURCE = os.getenv("DATA_SOURCE", "saramin")


def require_oracle() -> tuple[str, str, str]:
    """Oracle 적재 직전 호출. (user, password, dsn) 반환, 누락 시 즉시 실패."""
    return _req("ORACLE_USER"), _req("ORACLE_PASSWORD"), ORACLE_DSN


def require_hdfs() -> tuple[str, str, str]:
    """HDFS 적재 직전 호출. (webhdfs_url, user, root) 반환, 누락 시 즉시 실패."""
    return _req("HDFS_WEBHDFS_URL"), _req("HDFS_USER"), HDFS_ROOT


if __name__ == "__main__":
    print(f"ORACLE_DSN       = {ORACLE_DSN}  (user={ORACLE_USER})")
    print(f"HDFS_WEBHDFS_URL = {HDFS_WEBHDFS_URL}  (user={HDFS_USER}, root={HDFS_ROOT})")
    print(f"DATA_SOURCE      = {DATA_SOURCE}")
    print("설정 로드 OK")
