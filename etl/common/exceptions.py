"""ETL 단계별 예외 — 실패 지점을 구분/격리하기 위함."""


class EtlError(Exception):
    """ETL 공통 베이스 예외."""


class ExtractError(EtlError):
    """수집 단계 실패."""


class TransformError(EtlError):
    """표준화 단계 실패."""


class LoadError(EtlError):
    """적재 단계 실패."""