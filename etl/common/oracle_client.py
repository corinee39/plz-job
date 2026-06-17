"""Oracle 접속 헬퍼(oracledb thin 모드) + 셀프테스트."""
import oracledb

from etl.config import settings
from etl.common.logger import get_logger

log = get_logger("oracle")


def get_connection():
    return oracledb.connect(
        user=settings.ORACLE_USER,
        password=settings.ORACLE_PASSWORD,
        dsn=settings.ORACLE_DSN,
    )


if __name__ == "__main__":
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1 FROM DUAL")
        log.info("DUAL=%s", cur.fetchone()[0])
        cur.execute("SELECT table_name FROM user_tables ORDER BY 1")
        names = [r[0] for r in cur.fetchall()]
        log.info("테이블 %d개: %s", len(names), names)