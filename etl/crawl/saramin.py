"""사람인(saramin.co.kr) 채용 검색 결과 정적 크롤러.

requests + BeautifulSoup로 검색 결과 리스트 페이지를 파싱한다.
JS 렌더링 없이 서버 사이드 HTML만 사용하므로 봇 차단/약관 부담을 줄이기 위해
요청 간 지연과 페이지 수 상한을 둔다.

⚠️ 교육용 미니프로젝트 전제. 사람인 이용약관/robots.txt를 준수하고
과도한 요청을 보내지 않는다.
"""
import time
import urllib.parse
from dataclasses import dataclass, field
from datetime import date

import requests
from bs4 import BeautifulSoup

from common.logger import get_logger
from common.text import clean_text

log = get_logger("crawl.saramin")

BASE_URL = "https://www.saramin.co.kr/zf_user/search/recruit"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": "https://www.saramin.co.kr/",
}
# 사람인 검색 결과 페이지는 UTF-8로 서빙된다(서버 선언이 부정확할 때 대비해 강제).
RESPONSE_ENCODING = "utf-8"


@dataclass
class JobPosting:
    """검색 결과 1건. enrich 단계에서 스택/지역/직무가 덧붙는다."""

    source: str
    rec_idx: str
    company: str
    title: str
    location_raw: str
    experience: str
    education: str
    employment_type: str
    sector_keywords: list = field(default_factory=list)
    deadline: str = ""
    posted_raw: str = ""
    url: str = ""
    search_keyword: str = ""
    collected_date: str = ""

    def to_row(self) -> dict:
        return {
            "source": self.source,
            "rec_idx": self.rec_idx,
            "company": self.company,
            "title": self.title,
            "location_raw": self.location_raw,
            "experience": self.experience,
            "education": self.education,
            "employment_type": self.employment_type,
            # CSV 저장을 위해 리스트는 '|' 구분 문자열로 직렬화
            "sector_keywords": "|".join(self.sector_keywords),
            "deadline": self.deadline,
            "posted_raw": self.posted_raw,
            "url": self.url,
            "search_keyword": self.search_keyword,
            "collected_date": self.collected_date,
        }


def _build_url(keyword: str, page: int) -> str:
    qs = urllib.parse.urlencode({"searchword": keyword, "recruitPage": page})
    return f"{BASE_URL}?{qs}"


def _parse_item(item, keyword: str) -> JobPosting | None:
    """`.item_recruit` 한 개를 JobPosting으로 파싱. 방어적으로 처리."""
    tit = item.select_one(".job_tit a")
    if tit is None:
        return None
    title = clean_text(tit.get("title") or tit.get_text(" ", strip=True))
    if not title:
        return None

    href = tit.get("href", "")
    url = urllib.parse.urljoin("https://www.saramin.co.kr", href) if href else ""

    company = clean_text(_text(item, ".area_corp .corp_name"))

    # .job_condition > span: [지역, 경력, 학력, 고용형태] 순서(누락 가능)
    conds = [clean_text(sp.get_text(" ", strip=True))
             for sp in item.select(".job_condition span")]
    location_raw = conds[0] if len(conds) > 0 else ""
    experience = conds[1] if len(conds) > 1 else ""
    education = conds[2] if len(conds) > 2 else ""
    employment_type = conds[3] if len(conds) > 3 else ""

    # .job_sector a: 직무/스택 키워드 링크들("수정일 ..." 같은 꼬리 텍스트 회피)
    sector_keywords = [clean_text(a.get_text(strip=True))
                       for a in item.select(".job_sector a")]
    sector_keywords = [k for k in sector_keywords if k]

    deadline = clean_text(_text(item, ".job_date .date"))
    # .job_day: '등록일 26/05/19' / '수정일 26/05/19' (YY/MM/DD)
    posted_raw = clean_text(_text(item, ".job_day"))

    return JobPosting(
        source="saramin",
        rec_idx=str(item.get("value", "")),
        company=company,
        title=title,
        location_raw=location_raw,
        experience=experience,
        education=education,
        employment_type=employment_type,
        sector_keywords=sector_keywords,
        deadline=deadline,
        posted_raw=posted_raw,
        url=url,
        search_keyword=keyword,
    )


def _text(node, selector: str) -> str:
    el = node.select_one(selector)
    return el.get_text(" ", strip=True) if el else ""


def fetch_page(keyword: str, page: int, session: requests.Session,
               timeout: int = 15) -> list[JobPosting]:
    """검색 키워드 + 페이지 1개를 가져와 파싱."""
    url = _build_url(keyword, page)
    try:
        resp = session.get(url, headers=HEADERS, timeout=timeout)
    except requests.RequestException as exc:
        log.warning("요청 실패 keyword=%s page=%s: %s", keyword, page, exc)
        return []

    if resp.status_code != 200:
        log.warning("비정상 응답 keyword=%s page=%s status=%s",
                    keyword, page, resp.status_code)
        return []

    resp.encoding = RESPONSE_ENCODING
    soup = BeautifulSoup(resp.text, "lxml")
    items = soup.select(".item_recruit")
    if not items:
        log.warning("공고 항목 없음(셀렉터 변경/차단 의심) keyword=%s page=%s",
                    keyword, page)
        return []

    postings = []
    for it in items:
        try:
            p = _parse_item(it, keyword)
            if p:
                postings.append(p)
        except Exception as exc:  # 개별 항목 파싱 실패가 전체를 막지 않게
            log.warning("항목 파싱 오류 keyword=%s: %s", keyword, exc)
    log.info("수집 keyword=%s page=%s count=%d", keyword, page, len(postings))
    return postings


def crawl(keywords: list[str], start_page: int = 1, end_page: int = 1,
          delay: float = 1.5, collected_date: str | None = None) -> list[dict]:
    """여러 키워드 × 페이지 구간을 순회 수집하고 rec_idx 기준 중복 제거.

    start_page/end_page: 키워드당 수집할 페이지 구간(둘 다 포함, 1-base).
    예: start_page=6, end_page=10 → 6~10페이지만 수집(20페이지를
    5페이지씩 나눠 여러 회차로 누적 수집할 때 사용. run.py의 누적 로직이
    회차별 결과를 합쳐준다).
    collected_date: 이번 회차 수집일(ISO 문자열). 미지정 시 오늘 날짜.

    Returns: JobPosting.to_row() dict의 리스트.
    """
    if end_page < start_page:
        raise ValueError(f"end_page({end_page}) < start_page({start_page})")

    collected_date = collected_date or date.today().isoformat()
    session = requests.Session()
    seen: set[str] = set()
    rows: list[dict] = []

    for kw in keywords:
        for page in range(start_page, end_page + 1):
            postings = fetch_page(kw, page, session)
            for p in postings:
                key = p.rec_idx or f"{p.company}|{p.title}"
                if key in seen:
                    continue
                seen.add(key)
                p.collected_date = collected_date
                rows.append(p.to_row())
            time.sleep(delay)  # politeness delay

    log.info("크롤링 완료: 키워드 %d개, 페이지 %d~%d, 고유 공고 %d건",
             len(keywords), start_page, end_page, len(rows))
    return rows
