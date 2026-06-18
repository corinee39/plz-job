import pandas as pd

from etl.common.text import clean_text, to_iso_date
from etl.common.ids import make_external_id
from etl.transform.extract_stacks import extract_stacks


def test_clean_text_removes_markup():
    assert clean_text("<p>안녕&lt;br&gt;  하세요</p>") == "안녕 하세요"


def test_to_iso_date_ok_and_fail():
    assert to_iso_date("20260618") == "2026-06-18"
    assert to_iso_date("2026-06-18") == "2026-06-18"
    assert to_iso_date("미정") is None                    # 실패는 None(원본 보존은 호출부)


def test_external_id_prefers_id_else_url_hash():
    assert make_external_id("alio", 301826) == "301826"
    a = make_external_id("x", None, "https://a.com/p?utm_source=z&id=1")
    b = make_external_id("x", None, "https://a.com/p?id=1")   # 추적 파라미터 제거 → 동일
    assert a == b and a.startswith("url:")


def test_stacks_synonym_and_boundary():
    df = pd.DataFrame([{"source": "t", "external_id": "1", "title": "",
                        "description": "SpringBoot, JavaScript 경험"}])
    names = set(extract_stacks(df)["stack_name"])
    assert "Spring Boot" in names          # 동의어 통합
    assert "JavaScript" in names
    assert "Java" not in names             # JavaScript를 Java로 오탐하지 않음(경계)