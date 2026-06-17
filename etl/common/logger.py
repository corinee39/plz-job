"""공통 로거: 콘솔 + 파일(etl/logs/etl.log)."""
import logging
import sys
from pathlib import Path

_LOG_DIR = Path(__file__).resolve().parents[1] / "logs"   # etl/logs
_LOG_DIR.mkdir(exist_ok=True)


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:               # 중복 핸들러 방지
        return logger
    logger.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")

    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    fh = logging.FileHandler(_LOG_DIR / "etl.log", encoding="utf-8")
    fh.setFormatter(fmt)

    logger.addHandler(sh)
    logger.addHandler(fh)
    return logger