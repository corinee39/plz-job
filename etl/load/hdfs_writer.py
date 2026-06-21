"""크롤링 원본(raw)을 HDFS raw 적재존에 적재.

HDFS 를 "원천(raw landing zone)"으로 둔다. 회차마다 수집한 원본 공고 배열을
날짜 파티션 경로에 불변(immutable) JSON 으로 남겨, 재처리/감사 시 원본을
다시 확보할 수 있게 한다(로컬 CSV 는 dedup 누적용 working store).

경로 규약:
    {HDFS_ROOT}/raw/saramin/collected_date=YYYY-MM-DD/page_{label}.json
"""
import json

from hdfs import InsecureClient

from common.logger import get_logger
from config import settings

log = get_logger("load.hdfs_writer")


def _client() -> InsecureClient:
    url, user, _root = settings.require_hdfs()
    return InsecureClient(url, user=user)


def write_raw(rows: list[dict], collected_date: str, page_label: str) -> str:
    """이번 회차 raw 공고 배열을 HDFS raw 적재존에 JSON 으로 업로드.

    rows: saramin.crawl 이 돌려준 row dict 리스트(JSON 직렬화 가능).
    collected_date: 수집일(YYYY-MM-DD). 날짜 파티션 디렉터리.
    page_label: 회차 식별(예: '1-5'). 같은 날 여러 회차 구분.
    반환: 업로드한 HDFS 경로.
    """
    client = _client()
    _url, _user, root = settings.require_hdfs()
    hdfs_dir = f"{root}/raw/saramin/collected_date={collected_date}"
    hdfs_path = f"{hdfs_dir}/page_{page_label}.json"

    client.makedirs(hdfs_dir)
    payload = json.dumps(rows, ensure_ascii=False, indent=2)
    client.write(hdfs_path, data=payload.encode("utf-8"), overwrite=True)

    log.info("HDFS raw 적재: %s (%d건)", hdfs_path, len(rows))
    return hdfs_path
