# 데이터 사전 (Plz-Job DA — Processed)

## market_job_postings (공고 표준)

| 컬럼                        | 자료형 | 허용값/형식                                                     | 결측 처리                  | 비고                       |
| --------------------------- | ------ | --------------------------------------------------------------- | -------------------------- | -------------------------- |
| source                      | str    | alio, mpm                                                       | 필수                       | 출처 코드                  |
| external_id                 | str    | 외부ID 또는 `url:<해시>`                                        | 필수                       | (source, external_id) 고유 |
| company_name                | str    |                                                                 | '' 허용                    | 기관/회사명                |
| title                       | str    |                                                                 | 필수                       | 공고명                     |
| url                         | str    | http(s)                                                         | '' 허용                    | mpm 목록엔 없음→단건 link  |
| position_raw / position     | str    | position: 백엔드·프런트엔드·풀스택·데이터·AI·모바일·DevOps·기타 | 미매칭=기타                | position_map.csv           |
| region_raw / sido / sigungu | str    | sido: 표준 시·도                                                | 미매칭=미분류              | region_map.csv             |
| posted_date / deadline      | date   | YYYY-MM-DD                                                      | 파싱불가=NULL(+\_raw 보존) |                            |
| description                 | str    |                                                                 | '' 허용                    | 기술스택 추출 대상         |
| base_date                   | date   | YYYY-MM-DD                                                      | 필수                       | ETL 기준일                 |

## market_job_stacks (공고×스택 다대다)

| 컬럼                | 자료형 | 비고                             |
| ------------------- | ------ | -------------------------------- |
| source, external_id | str    | 공고 식별자(postings와 조인)     |
| stack_name          | str    | 표준 스택명(tech_stack_dict.csv) |
| matched_keyword     | str    | 원문에서 매칭된 키워드           |

## 표준화 규칙

- 문자열: HTML 엔티티 복원→태그 제거→공백 정리(`common/text.clean_text`).
- 날짜: `YYYYMMDD`/`YYYY-MM-DD` → `YYYY-MM-DD`, 실패는 NULL + 원본 보존.
- 직무/스택: 키워드 **경계 정규식**으로 부분문자열 오탐 축소. 단일문자(R/C/Go)는 문맥 포함 시에만 등록.
- 중복: `(source, external_id)` 기준 제거.

## 품질 요약 항목 (실행 로그)

raw 건수 · 중복 제거 건수 · Processed 건수 · 필수 결측 · 날짜 파싱 실패 · `기타` 직무 비율 · 지역 미분류 수 · 스택 행 수.

## 알려진 한계 (이 데이터셋)

- alio/mpm은 공공기관 **일반 채용**이라 개발 직무·기술스택 신호가 희소 → `기타` 비율이 높고 스택 행이 적은 것은 정상.
- mpm `areacode`는 코드값(예: `00000`=전국/미지정)이라 코드→시·도 매핑표 확보 전엔 `미분류`가 많다.
- mpm `type01/type02`는 의미 미확정(직무/고용형태 추정).