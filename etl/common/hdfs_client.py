"""WebHDFS 클라이언트 래퍼 + 연결 검증 셀프테스트."""
from hdfs import InsecureClient

from etl.config import settings
from etl.common.logger import get_logger

log = get_logger("hdfs")
_client = InsecureClient(settings.HDFS_WEBHDFS_URL, user=settings.HDFS_USER)


def mkdir(path):
    _client.makedirs(path)


def exists(path):
    return _client.status(path, strict=False) is not None


def write_text(path, data):
    _client.write(path, data=data, overwrite=True)


def read_text(path):
    with _client.read(path, encoding="utf-8") as r:
        return r.read()


def upload(local_path, remote_path):
    _client.upload(remote_path, local_path, overwrite=True)


def listdir(path):
    return _client.list(path)


def delete(path):
    _client.delete(path, recursive=True)


if __name__ == "__main__":
    root = settings.HDFS_ROOT
    for sub in ("raw", "processed", "aggregate", "error"):
        mkdir(f"{root}/{sub}")
    probe = f"{root}/raw/_conn_test.txt"
    write_text(probe, "hello-da-day1")
    assert read_text(probe) == "hello-da-day1"
    delete(probe)
    log.info("HDFS 검증 OK: %s", listdir(root))