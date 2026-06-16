# Plz-Job DA(데이터 분석) 7일 상세 업무 플랜

## 1. 개요

Plz-Job은 개발자 취업 준비생을 위한 **개인 취업 CRM + 채용시장 분석 플랫폼**이며, 개발 기간은 1주일이다. DA(Data Analyst)는 공공 채용 데이터를 대상으로 다음 흐름을 구현한다.

```text
공공 Open API·공개 파일
        ↓ Extract
Python 수집
        ↓
HDFS Raw 적재
        ↓ Transform
Pandas 정제·표준화·기술 스택 추출
        ↓
HDFS Processed 적재
        ↓ Aggregate
기술 스택·지역·월별 집계
        ↓ Load
Oracle 시장 데이터·분석 테이블 적재
        ↓
Spring Boot 분석 API → React 대시보드 → Ollama 분석 리포트
```

DA의 필수 책임 범위는 다음과 같다.

- 공공 채용 데이터 소스 정의 및 수집
- HDFS Raw·Processed·Aggregate·Error 영역 관리
- 중복·결측치·날짜·지역·직무·기술 스택 표준화
- `market_job_postings`, `market_job_stacks`, `analytics_*` 데이터셋 생성
- Oracle 적재, 재실행 멱등성, ETL 실행 로그 구현
- FE·BE가 사용할 시장 분석 데이터 계약과 기준일·표본 수 제공

### 담당 범위 구분

- **DA 담당:** 시장 월별 공고 수, 시장 기술 스택 추세, 지역별 시장 공고 수, 시장 기술 스택 비교 기준 데이터
- **BE 담당:** 사용자 개인 월별 지원 수, 단계별 전환율, 개인 합격률 계산
- **BE 통합 담당:** 사용자 보유·지원 기술과 DA의 시장 기술 데이터를 결합한 `/api/market/user-comparison`
- **Ollama 담당:** DA·BE가 미리 계산한 집계값을 자연어로 해석하며, 수치 계산은 수행하지 않음

개인 지원 단계·합격률 데이터는 공공데이터 ETL 대상이 아니므로 DA가 별도 집계하지 않는다.

---

## 2. 확정 환경과 운영 원칙

### 환경 전제

- **Hadoop/HDFS:** 구축된 클러스터를 제공받으며, 설치보다 접속·권한·적재 검증에 집중한다.
- **공공 Open API:** 신청 전 또는 승인 대기 상태이므로 1일차에 즉시 신청한다.
- **승인 지연 대응:** 공개 파일 또는 저장된 샘플 응답으로 전체 파이프라인을 먼저 완성하고, 승인 후 Extract 모듈만 교체한다.
- **Oracle:** BE와 동일한 인스턴스와 스키마를 사용한다.

### 운영 원칙

1. 1일차에 데이터 소스와 BE 연동 스키마를 합의한다.
2. 3일차 종료까지 Raw·Processed 적재와 표준 스키마를 확정한다.
3. 4일차 종료까지 Oracle 적재와 BE API 조회를 성공시킨다.
4. 5일차 이후 신규 핵심 기능을 추가하지 않고 검증·통합·시연에 집중한다.
5. API 키, DB 비밀번호, HDFS 계정정보는 환경변수로 관리하고 Git에 커밋하지 않는다.
6. ETL 실패 시 직전 성공 집계 데이터를 유지한다.

---

## 3. 권장 작업 디렉터리

```text
plz-job/
├─ etl/
│  ├─ config/
│  │  └─ settings.py          # 환경변수 읽기와 설정 검증
│  ├─ extract/
│  │  ├─ extract_sample.py    # 승인 전 샘플·공개 파일 수집
│  │  └─ extract_api.py       # 승인 후 Open API 수집
│  ├─ transform/
│  │  ├─ normalize_jobs.py    # 날짜·지역·직무·문자열 표준화
│  │  └─ extract_stacks.py    # 기술 스택 사전 기반 추출
│  ├─ aggregate/
│  │  └─ build_analytics.py   # 월별·기술 스택·지역 집계
│  ├─ load/
│  │  ├─ load_hdfs.py
│  │  └─ load_oracle.py
│  ├─ common/
│  │  ├─ hdfs_client.py
│  │  ├─ oracle_client.py
│  │  ├─ logger.py
│  │  └─ exceptions.py
│  ├─ tests/
│  │  ├─ test_transform.py
│  │  └─ test_aggregate.py
│  ├─ run_pipeline.py         # 전체 실행과 etl_runs 기록
│  └─ requirements.txt
├─ data/
│  ├─ sample/                 # 공개 파일 또는 저장된 샘플 응답
│  └─ dict/
│     ├─ tech_stack_dict.csv
│     ├─ region_map.csv
│     └─ position_map.csv
├─ docs/
│  ├─ data_source_spec.md     # 데이터 소스 정의서
│  ├─ data_dictionary.md      # 표준 컬럼과 전처리 기준
│  └─ etl_runbook.md          # 실행·복구·검증 방법
├─ .env.example
└─ .gitignore
```

**권장 라이브러리:** `requests`, `pandas`, `pyarrow`, `oracledb`, `python-dotenv`, HDFS 연결용 `hdfs` 또는 WebHDFS `requests`, 표준 `logging`.

---

## 4. 데이터 계약

### 4.1 공고 식별자

- 외부 공고 ID가 있으면 `source + external_id` 조합을 고유 식별자로 사용한다.
- 외부 ID가 없으면 정규화한 공고 URL의 SHA-256 해시를 `external_id` 대체값으로 사용한다.
- URL의 추적 파라미터는 제거한 뒤 해시를 생성한다.
- Oracle `market_job_postings`에는 `(source, external_id)` Unique 제약을 적용한다.

### 4.2 Processed 표준 스키마

| 컬럼 | 설명 |
|---|---|
| source | 데이터 출처 코드 |
| external_id | 외부 공고 ID 또는 URL 해시 |
| company_name | 회사명 |
| title | 공고명 |
| url | 공고 URL |
| position_raw | 원본 직무명 |
| position | 표준 직무명 |
| region_raw | 원본 지역명 |
| sido | 표준 시·도 |
| sigungu | 표준 시·군·구 |
| posted_date | 공고 시작일 또는 게시일 |
| deadline | 마감일 |
| description | 기술 스택 추출 대상 공고 본문 |
| collected_at | 수집 시각 |
| base_date | ETL 기준일 |

기술 스택은 공고별 다대다 구조로 분리한다.

| 컬럼 | 설명 |
|---|---|
| source | 데이터 출처 코드 |
| external_id | 공고 식별자 |
| stack_name | 표준 기술 스택명 |
| matched_keyword | 원문에서 매칭된 키워드 |

### 4.3 집계 정의

- **월별 시장 공고 수:** `COUNT(DISTINCT source || ':' || external_id)`
- **기술 스택 공고 수:** 해당 기술 스택이 포함된 고유 공고 수
- **시장 기술 스택 비율:** 동일한 기간·직무·지역 필터의 기술 스택 포함 공고 수 ÷ 전체 고유 공고 수 × 100
- **지역별 공고 수:** 동일 공고가 기술 스택 수만큼 중복 집계되지 않도록 고유 공고 기준으로 계산
- 분모가 0이면 `0%`가 아니라 `NULL` 또는 `dataAvailable=false`로 전달한다.

### 4.4 분석 테이블과 API 필터 정합성

요구사항의 분석 API 필터와 테이블 초안 사이에 다음 정합성 확인이 필요하다.

- `/api/market/stack-trends`는 `region` 필터를 받지만 `analytics_stack_trends` 초안에는 `region` 컬럼이 없다.
- `/api/market/region-distribution`은 `position` 필터를 받지만 `analytics_region_jobs` 초안에는 `position` 컬럼이 없다.

1일차에 BE와 다음 중 하나로 확정한다.

**권장안:** 대시보드 조회 성능과 구현 단순화를 위해 집계 테이블에 필터 컬럼을 포함한다.

```text
analytics_monthly_jobs
- base_month, position, region, posting_count
- UNIQUE(base_month, position, region)

analytics_stack_trends
- base_month, position, region, stack_name, posting_count, ratio
- UNIQUE(base_month, position, region, stack_name)

analytics_region_jobs
- base_month, position, region, posting_count
- UNIQUE(base_month, position, region)
```

대안은 `market_job_postings`와 `market_job_stacks`를 조회 시 조인하는 방식이지만, 1주일 프로젝트에서는 권장안이 더 단순하다.

### 4.5 HDFS 경로

```text
/plz-job/raw/source={source}/collected_date=YYYY-MM-DD/
/plz-job/processed/base_date=YYYY-MM-DD/
/plz-job/aggregate/base_date=YYYY-MM-DD/
/plz-job/error/run_date=YYYY-MM-DD/
```

---

## 5. 1일차 — 데이터 소스·스키마 확정과 접속 검증

**목표:** 데이터 소스를 결정하고 HDFS·Oracle 연결을 검증하며, FE·BE 연동 데이터 계약을 고정한다.

### 필수 작업

- [ ] 고용24·워크넷 채용정보, 공공기관 채용정보, 고용행정통계 중 **주 데이터 소스 1개와 예비 데이터 소스 1개**를 선정하고 Open API를 신청한다.
- [ ] 신청 승인 기간, 호출 제한, 이용 조건, 응답 형식(JSON/XML), 페이지네이션 방식을 확인한다.
- [ ] 회사명, 공고명, URL, 직무, 지역, 게시일, 마감일, 공고 본문 또는 요구 기술 필드 제공 여부를 확인한다.
- [ ] `docs/data_source_spec.md`에 원본 필드와 Processed 표준 컬럼의 매핑표를 작성한다.
- [ ] 샘플 응답 또는 공개 파일을 `data/sample/`에 확보한다.
- [ ] NameNode·WebHDFS 주소, 포트, 계정, 권한을 확인하고 생성·쓰기·읽기·삭제 테스트를 수행한다.
- [ ] 다음 HDFS 디렉터리를 생성한다.

```text
/plz-job/raw
/plz-job/processed
/plz-job/aggregate
/plz-job/error
```

- [ ] BE와 동일한 Oracle 인스턴스에 `oracledb`로 접속하여 `SELECT 1 FROM DUAL`을 실행한다.
- [ ] `market_job_postings`, `market_job_stacks`, `analytics_*`, `etl_runs`의 컬럼·키·자료형을 BE와 합의한다.
- [ ] 분석 테이블의 `region`, `position` 필터 정합성 문제를 해결한다.
- [ ] 분석 API 응답에 포함할 `baseDate`, `sampleCount`, `dataAvailable` 메타 필드를 합의한다.
- [ ] ETL 디렉터리, `.env.example`, `.gitignore`, `requirements.txt`, 공통 로거를 생성한다.

### 완료 조건

- HDFS 테스트 파일 쓰기와 읽기 성공
- Oracle 접속과 조회 성공
- API 신청 완료 또는 신청 불가 사유 기록
- 샘플 데이터 확보
- 데이터 소스 정의서 초안과 DB·JSON 데이터 계약 확정

---

## 6. 2일차 — Extract와 Raw HDFS 적재

**목표:** 승인 여부와 관계없이 재현 가능한 수집 모듈을 만들고 원본 응답을 HDFS Raw 영역에 보관한다. 대상 요구사항은 ETL-01, ETL-03, ETL-07, ETL-08, ETL-09이다.

### 필수 작업

- [ ] `extract_sample.py`를 구현하여 샘플 JSON·XML·CSV를 동일 인터페이스로 읽는다.
- [ ] `extract_api.py`를 구현하여 인증키, 검색 조건, 페이지네이션을 처리한다.
- [ ] 외부 호출에 연결·읽기 타임아웃, HTTP 상태 코드 검사, 제한된 재시도와 대기 시간을 적용한다.
- [ ] API 호출 제한을 넘지 않도록 페이지 수 또는 최대 수집 건수를 설정 파일로 관리한다.
- [ ] 수집한 원본 응답은 변형하지 않고 다음 경로에 저장한다.

```text
/plz-job/raw/source={source}/collected_date=YYYY-MM-DD/
```

- [ ] 수집 시각, 요청 조건, 페이지 수, 추출 건수를 별도 메타 로그에 기록한다. 인증키와 DB 비밀번호는 로그에 남기지 않는다.
- [ ] 외부 ID 또는 URL 해시 기반의 공고 식별자 생성 함수를 구현한다.
- [ ] `hdfs_client.py`에 `mkdir`, `put`, `exists`, `read`, `list` 기능을 구현한다.
- [ ] 특정 페이지 또는 레코드 실패가 전체 수집을 즉시 중단시키지 않도록 오류를 격리한다.
- [ ] 실패 원인과 원본 식별정보를 `/plz-job/error/run_date=YYYY-MM-DD/` 또는 로컬 로그에 기록한다.

### 협업

- BE에 `market_job_postings` 적재 예정 필드와 최초 데이터 제공 시점을 공유한다.
- API가 공고 URL 자동 입력 기능에도 사용될 경우 BE와 호출 책임을 구분한다. 정기 시장 데이터 수집은 DA ETL, 사용자 단건 미리보기 요청은 BE가 담당하는 방식을 권장한다.

### 완료 조건

- 샘플 기준 Raw 파일이 날짜·출처 파티션 경로에 생성됨
- 수집 건수와 Raw 파일 건수가 확인됨
- API 오류·타임아웃·빈 응답을 처리함
- 인증정보가 코드와 로그에 노출되지 않음

---

## 7. 3일차 — Transform·표준화와 Processed 적재

**목표:** 공공데이터를 분석 가능한 표준 스키마로 변환하고 HDFS Processed 영역에 적재한다. 대상 요구사항은 ETL-02와 ETL-04이다.

### 필수 작업

- [ ] 문자열 앞뒤 공백, HTML 태그, 불필요한 개행을 제거한다.
- [ ] 날짜를 `YYYY-MM-DD`로 통일하고 파싱 불가 값은 원본값과 오류 사유를 보존한다.
- [ ] 지역을 시·도와 시·군·구로 분리하고 `region_map.csv`로 표준화한다.
- [ ] 직무를 백엔드, 프런트엔드, 풀스택, 데이터, AI, 모바일, DevOps, 기타로 표준화한다.
- [ ] 기술 스택을 사전 기반으로 추출하고 동의어를 통합한다.

```text
SpringBoot, Spring Boot → Spring Boot
React.js, ReactJS → React
NodeJS, Node.js → Node.js
```

- [ ] 기술 스택 단어는 부분 문자열 오탐을 줄이도록 경계 또는 정규식을 적용한다. 예를 들어 `R`은 일반 영문자와 구분한다.
- [ ] `(source, external_id)` 기준으로 중복 공고를 제거한다.
- [ ] 원본 컬럼과 표준 컬럼을 함께 보존한다.
- [ ] `market_job_postings`용 공고 데이터와 `market_job_stacks`용 기술 스택 데이터를 분리한다.
- [ ] Processed 파일을 CSV 또는 Parquet로 다음 경로에 적재한다.

```text
/plz-job/processed/base_date=YYYY-MM-DD/
```

- [ ] `docs/data_dictionary.md`에 컬럼 정의, 자료형, 허용값, 결측 처리, 표준화 규칙을 기록한다.
- [ ] 변환 테스트를 작성한다.
  - 날짜 정상·비정상 입력
  - 지역 별칭
  - 직무 미분류
  - 기술 스택 동의어
  - 중복 공고
  - 필수값 누락
- [ ] 품질 요약을 기록한다.
  - Raw 건수
  - 중복 제거 건수
  - Processed 건수
  - 필수 필드 결측 건수
  - `기타` 직무 비율
  - 지역 미분류 건수

### 협업

- 3일차 종료 전에 BE와 표준 스키마 및 Oracle 자료형을 최종 고정한다.
- FE가 차트에 표시할 직무·지역·기술 스택 명칭을 공유하여 화면과 데이터의 용어를 일치시킨다.

### 완료 조건

- Processed 공고·기술 스택 파일 생성
- 표준 스키마와 데이터 사전 확정
- 주요 전처리 테스트 통과
- 품질 요약에서 비정상 값의 규모를 확인함

---

## 8. 4일차 — 시장 데이터 집계와 Oracle Load

**목표:** 시장 공고와 분석 집계를 Oracle에 적재하여 Spring Boot 분석 API에서 조회할 수 있게 한다. 대상 요구사항은 ETL-05, ETL-06, ETL-08, DASH-04, DASH-05, DASH-06이다.

### 필수 작업

- [ ] 고유 공고 기준으로 월별·직무별·지역별 공고 수를 집계한다.
- [ ] 고유 공고 기준으로 월별·직무별·지역별 기술 스택 공고 수와 비율을 집계한다.
- [ ] 지역별 공고 수를 직무 필터가 가능한 형태로 집계한다.
- [ ] 집계 결과를 다음 경로에 CSV 또는 Parquet로 보관한다.

```text
/plz-job/aggregate/base_date=YYYY-MM-DD/
```

- [ ] `market_job_postings`에 표준화 공고를 적재한다.
- [ ] `market_job_stacks`에 공고별 기술 스택을 적재한다.
- [ ] `analytics_monthly_jobs`, `analytics_stack_trends`, `analytics_region_jobs`를 적재한다.
- [ ] `(source, external_id)`와 분석 테이블 복합 Unique 키를 기준으로 Oracle `MERGE`를 구현한다.
- [ ] 기술 스택 비율의 분모는 기술 스택 행 수가 아니라 같은 필터 조건의 **전체 고유 공고 수**로 계산한다.
- [ ] 분모 0은 `0`이 아닌 `NULL` 또는 데이터 부족 상태로 처리한다.
- [ ] 적재 중 오류가 발생하면 전체 트랜잭션을 롤백하여 직전 성공 데이터를 유지한다.
- [ ] 가능하면 임시·스테이징 테이블에 먼저 적재하고 검증 후 본 테이블에 MERGE한다.

### API 연동 확인

다음 API가 필요한 데이터를 반환할 수 있는지 BE와 확인한다.

```http
GET /api/market/stack-trends?from=&to=&position=&region=
GET /api/market/region-distribution?from=&to=&position=
GET /api/market/user-comparison?from=&to=
```

DA는 시장 기술 스택·지역 데이터를 제공하고, 개인 월별 지원·단계별 전환율·합격률은 BE가 사용자 서비스 테이블에서 계산한다.

### 완료 조건

- Oracle에서 시장 공고·기술 스택·분석 집계 행 조회 성공
- 중복 키가 존재하지 않음
- 기술 스택 비율의 분자·분모 수기 검증 통과
- Spring Boot 시장 분석 API 조회 성공
- FE가 사용할 `baseDate`, `sampleCount`, `dataAvailable` 제공 가능

---

## 9. 5일차 — ETL 로그·재실행·장애 보존 처리

**목표:** ETL-07~10을 충족하고 파이프라인을 반복 실행해도 안전한 상태로 만든다.

### 필수 작업

- [ ] `etl_runs`에 다음 값을 저장한다.
  - `run_id`
  - `source`
  - `started_at`
  - `ended_at`
  - `status`
  - `extracted_count`
  - `loaded_count`
  - `error_message`
- [ ] 파일 로그에는 단계별 Raw·Processed·Aggregate 건수와 오류 건수를 추가로 남긴다.
- [ ] `run_pipeline.py`에서 Extract → Raw Load → Transform → Processed Load → Aggregate → Oracle Load 순서를 제어한다.
- [ ] 각 단계 실패 시 상태를 기록하고, Oracle 최종 적재 전 실패라면 기존 집계 데이터를 변경하지 않는다.
- [ ] 동일 샘플을 두 번 실행하여 `market_job_postings`, `market_job_stacks`, `analytics_*`의 행 수와 값이 중복 증가하지 않는지 확인한다.
- [ ] 일부 잘못된 레코드를 넣어 정상 레코드는 처리되고 오류 레코드는 격리되는지 확인한다.
- [ ] 최신 성공 실행의 `baseDate`, 표본 수, 실행 상태를 BE가 조회할 수 있게 제공한다.
- [ ] Spring Boot의 Hadoop 연동 또는 상태 확인 기능이 사용할 HDFS 경로와 최신 파일 정보를 공유한다.
- [ ] API가 승인된 경우 `extract_api.py`로 전환해 실데이터로 재실행한다. 승인되지 않았다면 샘플 기반임을 화면과 발표 자료에 명시한다.

### 기능 동결

5일차 종료 후에는 새로운 모델·대규모 분석·추가 데이터 소스를 도입하지 않는다. 필수 파이프라인과 통합 오류 수정에 집중한다.

### 완료 조건

- 동일 입력 2회 실행 결과 동일
- `etl_runs` 성공·실패 이력 저장
- 일부 오류가 전체 서비스 장애로 이어지지 않음
- 실패 실행 후 직전 성공 Oracle 집계 유지
- 최신 기준일과 표본 수를 API에서 확인 가능

---

## 10. 6일차 — 데이터 품질·통합 검증과 시연 준비

**목표:** 데이터 신뢰성을 확인하고 Hadoop·Oracle·대시보드 연결을 발표 가능한 상태로 만든다.

### 필수 품질 검증

- [ ] API 응답 누락 필드 처리
- [ ] 공고 중복 제거
- [ ] 날짜 파싱과 기간 범위 확인
- [ ] 지역 표준화와 미분류 비율 확인
- [ ] 직무 표준화와 `기타` 비율 확인
- [ ] 기술 스택 동의어와 오탐 샘플 확인
- [ ] 기술 스택별 고유 공고 수 검증
- [ ] 분석 테이블 복합 키 중복 확인
- [ ] Oracle 집계와 HDFS Aggregate 파일 수치 비교
- [ ] 재실행 멱등성 확인
- [ ] 부분 오류 지속성과 기존 데이터 보존 확인
- [ ] 분모 0·표본 부족 상태 확인

### 통합 검증

- [ ] FE의 기술 스택·지역 차트에 집계 데이터가 정상 표시되는지 확인한다.
- [ ] 기간·직무·지역 필터 변경 시 값이 논리적으로 변하는지 확인한다.
- [ ] 차트에 데이터 기준일과 표본 수가 표시되는지 확인한다.
- [ ] 개인 기술 스택과 시장 기술 스택 비교 API에서 시장 데이터가 올바르게 결합되는지 확인한다.
- [ ] Ollama 입력에는 원본 공고 전체가 아니라 집계값과 비교 수치만 전달되는지 확인한다.

### 시연 준비

- [ ] Raw·Processed·Aggregate HDFS 경로와 샘플 파일을 준비한다.
- [ ] HDFS 접속 장애에 대비해 로컬 복사본과 성공 실행 로그를 보관한다.
- [ ] 시장 상위 기술 스택, 지역 분포, 월별 추세에서 발표할 인사이트 2~3개를 정리한다.
- [ ] 인사이트에 기준 기간, 표본 수, 데이터 출처를 함께 표시한다.

### 여유 시간이 있을 때만 수행

- [ ] TF-IDF 기반 공고 핵심 키워드 추출
- [ ] 사용자 보유 기술과 시장 기술의 단순 일치율
- [ ] 유사 공고 탐색

이를 합격 가능성 예측으로 표현하지 않는다.

### 완료 조건

- 필수 품질 체크 통과
- FE·BE 통합 차트와 필터 동작 확인
- 시연용 HDFS·Oracle·로그·로컬 백업 준비
- 출처·기간·표본 수가 포함된 분석 인사이트 정리

---

## 11. 7일차 — End-to-End 시연과 산출물 정리

**목표:** ETL 실행부터 대시보드 반영까지의 전체 흐름과 요구사항 발표 시나리오 9·10번을 중단 없이 시연한다.

### 시연 순서

1. `run_pipeline.py` 실행
2. HDFS Raw 파일 확인
3. HDFS Processed 파일과 표준화 결과 확인
4. HDFS Aggregate 파일 확인
5. `etl_runs` 성공 상태와 처리 건수 확인
6. Oracle 시장 공고·집계 테이블 확인
7. Spring Boot 시장 분석 API 호출
8. React 기술 스택·지역·개인 비교 차트 확인
9. 데이터 기준일과 표본 수 확인
10. 집계값 기반 Ollama 분석 리포트 확인

### 최종 산출물

- [ ] 데이터 소스 정의서
- [ ] Python 수집 스크립트
- [ ] 전처리 기준과 데이터 사전
- [ ] HDFS Raw·Processed 적재 구조
- [ ] 기술 스택·지역·월별 분석 코드
- [ ] Oracle 적재 스크립트
- [ ] ETL 실행 로그
- [ ] 분석 결과와 시각화용 데이터셋
- [ ] `README` 또는 `etl_runbook.md` 실행 가이드

### 장애 대비

- Hadoop 접속 실패 시 로컬 Raw·Processed·Aggregate 파일과 성공 로그를 제시한다.
- Open API 장애 시 저장된 샘플 응답으로 파이프라인을 실행한다.
- Ollama 장애 시 집계 차트와 사전에 저장한 정상 응답을 이용하되, 실시간 생성이 아님을 명시한다.
- Oracle 적재 실패 시 직전 성공 집계가 유지되는 것을 설명한다.

### 완료 조건

- 발표 시나리오의 Hadoop Raw·Processed 및 ETL 로그 확인 완료
- Oracle 집계와 서비스 화면 연결 확인 완료
- 필수 DA 산출물 제출
- 실행 가이드만으로 다른 팀원이 샘플 파이프라인을 재현 가능

---

## 12. 마일스톤 게이트

| 시점 | 반드시 끝나야 할 것 |
|---|---|
| 1일차 종료 | API 신청, 데이터 소스 선정, HDFS·Oracle 접속, DB·JSON 계약 확정 |
| 2일차 종료 | 샘플 Extract와 Raw HDFS 적재 |
| 3일차 종료 | 표준화, Processed 적재, 데이터 사전 확정 |
| **4일차 종료** | **시장 데이터·집계 Oracle Load, Spring Boot 시장 API 조회 성공** |
| 5일차 종료 | ETL 로그, 멱등성, 실패 시 기존 집계 보존, 기능 동결 |
| 6일차 종료 | 데이터 품질·FE/BE 통합 검증과 시연 백업 준비 |
| 7일차 종료 | End-to-End 시연과 산출물 제출 |

---

## 13. 주요 위험과 대응

| 위험 | 대응 |
|---|---|
| Open API 승인 지연 | 샘플·공개 파일로 전체 파이프라인을 먼저 완성하고 Extract만 교체 |
| 필요한 공고 본문·기술 필드 부족 | 신청 전에 필드 확인, 제목·직무·요구조건 필드 조합 사용, 부족하면 보조 데이터 소스 채택 |
| HDFS 권한 또는 접속 문제 | 1일차 읽기·쓰기 검증, 로컬 파일과 실행 로그 백업 |
| Oracle 적재 중 실패 | 트랜잭션·롤백 또는 스테이징 테이블 사용, 직전 성공 집계 유지 |
| 기술 스택 다대다 조인으로 공고 수 중복 | 모든 집계를 고유 공고 식별자 기준으로 계산 |
| 분석 테이블과 API 필터 불일치 | 1일차 `region`, `position` 컬럼 포함 여부를 BE와 확정 |
| 표본 부족으로 비율 왜곡 | 표본 수 표시, 분모 0은 데이터 부족 처리, 예측 대신 기술통계 사용 |
| 팀별 직무·지역·스택 명칭 불일치 | 공통 코드·표준 명칭을 3일차 전에 고정 |
| 기능 과다 | 5일차 이후 신규 기능 금지, TF-IDF·유사도는 필수 통합 후에만 수행 |
| 비밀정보 노출 | `.env`, `.gitignore`, 로그 마스킹, 샘플 키만 문서화 |

---

## 14. End-to-End 검증 방법

### 1. 파이프라인 실행

```bash
python etl/run_pipeline.py --source sample --base-date YYYY-MM-DD
```

### 2. HDFS 파일 확인

```bash
hdfs dfs -ls /plz-job/raw
hdfs dfs -ls /plz-job/processed
hdfs dfs -ls /plz-job/aggregate
hdfs dfs -ls /plz-job/error
```

### 3. Oracle 적재 확인

```sql
SELECT COUNT(*) FROM market_job_postings;
SELECT COUNT(*) FROM market_job_stacks;
SELECT COUNT(*) FROM analytics_monthly_jobs;
SELECT COUNT(*) FROM analytics_stack_trends;
SELECT COUNT(*) FROM analytics_region_jobs;
SELECT * FROM etl_runs ORDER BY started_at DESC FETCH FIRST 5 ROWS ONLY;
```

### 4. 중복 확인

```sql
SELECT source, external_id, COUNT(*)
FROM market_job_postings
GROUP BY source, external_id
HAVING COUNT(*) > 1;
```

분석 테이블도 각 복합 Unique 키 기준으로 중복 결과가 0건인지 확인한다.

### 5. 멱등성 확인

동일한 기준일과 샘플로 두 번 실행한 후 다음을 비교한다.

- 시장 공고 행 수
- 공고별 기술 스택 행 수
- 분석 집계 행 수
- 각 집계값과 비율

### 6. API 확인

```http
GET /api/market/stack-trends?from=&to=&position=&region=
GET /api/market/region-distribution?from=&to=&position=
GET /api/market/user-comparison?from=&to=
```

### 7. 화면 확인

- 기술 스택·지역 차트가 API 값과 일치하는지 확인한다.
- 필터 변경 시 데이터가 다시 조회되는지 확인한다.
- 데이터 없음과 API 오류가 구분되는지 확인한다.
- 기준일·표본 수·데이터 부족 상태가 표시되는지 확인한다.
