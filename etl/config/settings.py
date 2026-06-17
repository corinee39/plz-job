"""환경변수 로딩과 검증. 모든 모듈은 여기서 설정을 읽는다."""
import os
from pathlib import Path
from dotenv import load_dotenv

ETL_DIR = Path(__file__).resolve().parents[1]      # .../etl
DATA_DIR = ETL_DIR / "data"
load_dotenv(ETL_DIR / ".env")                      # etl/.env 로드


def _req(key: str) -> str:
    """필수 환경변수를 읽고, 비었거나 placeholder면 에러."""
    v = os.getenv(key)
    if not v or v.startswith("<") or v.startswith("__"):
        raise RuntimeError(f"환경변수 누락/미설정: {key} (etl/.env 확인)")
    return v


# Oracle
ORACLE_USER = _req("ORACLE_USER")
ORACLE_PASSWORD = _req("ORACLE_PASSWORD")
ORACLE_DSN = f'{_req("ORACLE_HOST")}:{os.getenv("ORACLE_PORT", "1522")}/{_req("ORACLE_SERVICE")}'

# HDFS
HDFS_WEBHDFS_URL = _req("HDFS_WEBHDFS_URL")
HDFS_USER = _req("HDFS_USER")
HDFS_ROOT = os.getenv("HDFS_ROOT", "/plz-job")

# API (1일차엔 선택 — 없어도 접속검증엔 무관)
DATA_SOURCE = os.getenv("DATA_SOURCE", "alio")
DATA_GO_KR_SERVICE_KEY = os.getenv("DATA_GO_KR_SERVICE_KEY", "")
KOSIS_API_KEY = os.getenv("KOSIS_API_KEY", "")


if __name__ == "__main__":
    print("ORACLE_DSN       =", ORACLE_DSN)
    print("HDFS_WEBHDFS_URL =", HDFS_WEBHDFS_URL, "/ user =", HDFS_USER)
    print("DATA_SOURCE      =", DATA_SOURCE)
    print("설정 로딩 OK")