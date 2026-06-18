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

# Extract 튜닝 (2일차) — .env로 덮어쓰기 가능
EXTRACT_NUM_ROWS = int(os.getenv("EXTRACT_NUM_ROWS", "100"))    # 페이지당 건수
EXTRACT_MAX_PAGES = int(os.getenv("EXTRACT_MAX_PAGES", "2"))    # 최대 페이지(시연=작게)
EXTRACT_MAX_DETAILS = int(os.getenv("EXTRACT_MAX_DETAILS", "20"))  # idx별 getItem 호출 상한(시연=작게)
HTTP_TIMEOUT_CONNECT = float(os.getenv("HTTP_TIMEOUT_CONNECT", "5"))
HTTP_TIMEOUT_READ = float(os.getenv("HTTP_TIMEOUT_READ", "20"))
HTTP_MAX_RETRIES = int(os.getenv("HTTP_MAX_RETRIES", "3"))
HTTP_BACKOFF = float(os.getenv("HTTP_BACKOFF", "1.5"))          # 재시도 대기 배수(초)

# 승인된 Open API base URL (operation 경로는 호출 시 붙인다)
ALIO_API_URL = os.getenv("ALIO_API_URL", "")
MPM_API_URL = os.getenv("MPM_API_URL", "")
KOSIS_API_URL = os.getenv("KOSIS_API_URL", "https://kosis.kr/openapi")


if __name__ == "__main__":
    print("ORACLE_DSN       =", ORACLE_DSN)
    print("HDFS_WEBHDFS_URL =", HDFS_WEBHDFS_URL, "/ user =", HDFS_USER)
    print("DATA_SOURCE      =", DATA_SOURCE)
    print("설정 로딩 OK")