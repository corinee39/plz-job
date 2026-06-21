# ETL — 사람인 채용공고 크롤링 · 분석

공공 OpenAPI 대신 **사람인(saramin.co.kr) 채용 검색 결과를 정적 크롤링**해
기술 스택 / 지역 / 직무를 태깅하고, 프론트 대시보드(DASH-04/05/06)가 먹는
형태로 집계한다.

```
크롤링(requests+BeautifulSoup) → 태깅(pandas+dict) → 집계 → CSV / 프론트 JSON
```

## 구조

| 경로 | 역할 |
|------|------|
| `crawl/saramin.py` | 사람인 검색 결과 정적 크롤러 |
| `transform/enrich.py` | 스택/지역/직무/마감 태깅 (`data/dict/*.csv` 사용) |
| `common/dates.py` | 사람인 마감 표기('~ 07/20(월)', '상시채용' 등) 파싱 |
| `analyze/market.py` | DASH-04/05/06 집계 |
| `run.py` | 오케스트레이터(누적 + 유효 공고 필터링) |
| `data/dict/` | 매핑 사전(tech_stack/region/position) |
| `data/output/` | 산출 CSV |

## 실행

```bash
cd etl
pip install -r requirements.txt
python run.py --start-page 1 --end-page 5 --keywords 백엔드,프론트엔드,데이터,AI,모바일,DevOps
```

옵션:
- `--keywords` 검색 키워드(쉼표 구분, 기본: 직무 6종)
- `--start-page` / `--end-page` 키워드당 수집할 페이지 구간(1-base, 둘 다 포함, 기본 1~1)
- `--delay` 요청 간 지연 초(기본 1.5)
- `--top` 집계 상위 N(기본 10)

### 페이지 구간을 나눠 수집하기

DASH-04/05를 최근 20페이지 분량으로 그리고 싶다면, 한 번에 20페이지를
긁기보다 차단 위험을 줄이도록 **5페이지씩 나눠 여러 회차로 실행**한다.
`raw_jobs.csv` 누적 로직이 회차별 결과를 합쳐주므로 최종적으로
1~20페이지가 모두 쌓인다:

```bash
python run.py --start-page 1  --end-page 5  --keywords 백엔드,프론트엔드,데이터,AI,모바일,DevOps
python run.py --start-page 6  --end-page 10 --keywords 백엔드,프론트엔드,데이터,AI,모바일,DevOps
python run.py --start-page 11 --end-page 15 --keywords 백엔드,프론트엔드,데이터,AI,모바일,DevOps
python run.py --start-page 16 --end-page 20 --keywords 백엔드,프론트엔드,데이터,AI,모바일,DevOps
```

## 누적 & 유효 공고 필터링

`run.py`를 실행할 때마다 `raw_jobs.csv`를 덮어쓰지 않고 **누적**한다.
- 같은 공고(`rec_idx` 기준, 없으면 `company|title`)가 여러 회차에 걸쳐 수집되면
  가장 최근 `collected_date`의 행으로 갱신되고 중복으로 쌓이지 않는다.
- `enriched_jobs.csv`는 누적된 전체 데이터를 다시 태깅한 결과이며,
  `deadline_date`/`is_open` 컬럼이 추가된다(`common/dates.py`로 마감 표기 파싱).
- DASH-04/05/06 집계는 **`is_open=True`인 공고만** 사용한다 — 시간이 지나
  누적 데이터 중 일부가 마감되어도, 이미 마감된 공고가 "현재 시장 비율"을
  왜곡하지 않도록 제외한다.

## 산출물

- `data/output/raw_jobs.csv` — 크롤링 원본 공고(누적)
- `data/output/enriched_jobs.csv` — 태깅 + 마감 정보(누적)
- `data/output/market_stack_trends.csv` — DASH-04 (유효 공고 기준)
- `data/output/market_region_distribution.csv` — DASH-05 (유효 공고 기준)
- `../frontend/src/mocks/data/market.json` — 프론트 대시보드 연동 데이터

프론트는 MSW(`VITE_API_MOCKING=enabled`) 상태에서 `market.json`을 읽어
DASH-04/05/06 차트에 실데이터를 렌더한다. 백엔드/Oracle은 사용하지 않는다.

> DASH-06(내 지원 vs 시장)의 `userRatio`는 사용자 본인 지원 데이터라
> 크롤링과 무관하다. `marketRatio`/`gap`만 실데이터로 갱신되고
> `userRatio`는 `analyze/market.py`의 `DEFAULT_USER_RATIO` 값을 쓴다.

## ⚠️ 주의

사람인 크롤링은 해당 사이트 **이용약관 / robots.txt** 적용 대상이다.
교육용 미니프로젝트 전제로, 코드에 User-Agent·요청 간 지연·페이지 수 상한을 두어
과도한 요청을 보내지 않는다. 운영/상업적 사용 시 공식 API 또는 별도 협의가 필요하다.
