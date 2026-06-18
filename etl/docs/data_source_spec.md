# 데이터 소스 정의서 (Plz-Job DA)

## 1. 소스 목록
| source | 이름 | 엔드포인트 | operation | 인증 | 응답형식 | 호출제한 | 비고 |
|---|---|---|---|---|---|---|---|
| alio | 재정경제부_공공기관 채용정보 | https://apis.data.go.kr/1051000/recruitment | `/list`(목록), `/detail`(단건) | 일반 인증키 | **JSON** | (확인) | 주 소스. 목록 totalCount=111,020 |
| mpm | 인사혁신처_공공취업정보 | https://apis.data.go.kr/1760000/PblJobService | `/getList`(목록), `/getItem`(단건) | 일반 인증키(공용) | **XML** | (확인) | 보조. url·본문은 단건에만 |
| kosis | KOSIS 공유서비스 | https://kosis.kr/openapi | `statisticsSearch.do`(통합검색), `Param/statisticsParameterData.do`(자료) | 별도 인증키(`apiKey`) | **JSON** | (확인) | 통계 보조. 집계 소스(공고 단위 아님) |
| saramin | 사람인 채용정보 | https://oapi.saramin.co.kr | `/job-search`(목록, keyword 포함 → 단건 불필요) | 별도 `access-key` | **JSON**(`Accept` 헤더) | 1일 500회 | IT 소스. `job_mid_cd=22`(IT개발·데이터). 직무·기술스택 분석 대상 |

> data.go.kr 일반 인증키는 계정당 1개를 구독 API 전체에 재사용(alio·mpm 공용). 사람인은 별도 발급한 `access-key`를 `etl/.env`의 `SARAMIN_ACCESS_KEY`에 둔다.

**로컬 보유 파일 (API 외 — 연습·사전용, 출처가 alio/mpm/kosis와 다름):**
| 위치(source) | 파일 | 용도 |
|---|---|---|
| raw/work24 | 고용24 구인구직 취업동향 XLSX | 지역·산업·고용형태 추세 분석 |
| data/dict | 워크넷 직업분류 CSV | 직무명 표준화 사전(3일차) — Raw 아님 |

## 2. 필드 매핑 (원본 → Processed → Oracle)
> 원본 필드명은 샘플 응답으로 확정(`etl/data/sample/`의 `alio_sample.json`, `mpm_sample.xml`, `mpm_item_sample.xml`, 2026-06-18 수집).
> mpm은 **목록(`getList`)에 없는 url·본문이 단건(`getItem`)에만** 있어, 2일차 수집은 목록→단건 2단계로 한다.

| Processed 표준 | Oracle 컬럼 | alio 원본(`/list`) | mpm 원본(`getList`/**getItem**) | 비고 |
|---|---|---|---|---|
| company_name | company_name | `instNm` | `insttname` | 기관명 |
| title | title | `recrutPbancTtl` | `title` | |
| url | url | `srcUrl` | **`link01`~`link03`**(단건) | mpm 목록엔 URL 없음. 셋 다 빈 경우 `external_id`로 식별 |
| external_id | external_id | `recrutPblntSn` | `idx` | 둘 다 고유ID 제공 → URL 해시 불필요 |
| position_raw→position | position | `ncsCdNmLst` | `type01`/`type02`(의미 확인) | NCS 분류명, 8종 표준화(3일차). 코드는 `ncsCdLst` |
| region_raw→region/sigungu | region/sigungu | `workRgnNmLst` | `areacode`(코드) | alio=지역명(코드 `workRgnLst`), mpm=코드만→코드표 필요 |
| posted_date | posted_date | `pbancBgngYmd` | `regdate`(목록)/**`begindate`**(단건) | YYYYMMDD → YYYY-MM-DD 통일 |
| deadline | deadline | `pbancEndYmd` | `enddate` | |
| description | (저장 안 함) | `aplyQlfcCn`(+`prefCn`,`scrnprcdrMthdExpln`) | **`contents`**(단건, HTML) | 기술스택 추출용. mpm은 단건에서만 |

**기타 유용 필드(통계 보조 — alio):** `hireTypeNmLst`(고용형태: 정규직/비정규직/청년인턴), `recrutSeNm`(신입/경력/신입+경력), `acbgCondNmLst`(학력), `recrutNope`(채용인원), `ongoingYn`(진행중).
**mpm 기타 필드:** `insttcode`(기관코드), `moddate`(수정일), `readnum`(조회수). `type01`/`type02`는 의미 확인 필요(직무·고용형태 추정).

### 2.1 kosis (통계 보조 — 공고 단위 아님)
KOSIS는 집계 통계 소스라 위 공고 매핑과 별개로 **analytics 보조 지표**에 쓴다.
- 통합검색(`statisticsSearch.do`) 응답 필드: `ORG_ID`,`TBL_ID`(통계표 식별), `TBL_NM`,`STAT_NM`,`MT_ATITLE`(분류), `STRT_PRD_DE`/`END_PRD_DE`(수록기간), `LINK_URL`. → "어떤 통계표가 있는지" 목록일 뿐 실데이터 아님.
- 실데이터는 `Param/statisticsParameterData.do`에 `orgId`+`tblId`+`itmId`+`objL1`+`prdSe` 지정해 호출. 후보(검색 "고용"): `118/DT_11827_A001`(시도별 고용허가제 사업장 수, 지역 차원), `118/DT_11831_N001`(고령자 고용률, 2012~2025).

## 3. 스키마·메타필드 확인 (BE 합의)
- 시장/분석 6개 테이블·키·자료형은 `db/schema.sql` 기준 확정(플랜 §4.4 권장안) → 변경 없음, 확인 완료.
- 필터 정합성: analytics_stack_trends.region, analytics_region_jobs.position 존재 확인, "전체"=`'ALL'`.
- 메타필드 baseDate(최신 SUCCESS etl_runs.base_date)·sampleCount(extracted_count)·dataAvailable
  은 docs/API_명세서.md에 정의됨 → BE와 동일 정의 사용.

## 4. API 신청 상태
- alio / mpm / kosis: 승인 완료(키 발급됨).
- 응답형식·operation·제공 필드: alio·mpm(목록+단건)·kosis(통합검색) 샘플로 **확인 완료**(2026-06-18, 위 표 반영).
  - alio: JSON, 레코드는 `result[]`. mpm: XML, 목록 `items.item[]` / 단건 `body.item`. kosis: JSON, 최상위 배열.
  - mpm url(`link01~03`)·본문(`contents`)은 **단건(`getItem`)에만** 존재 확인 → 2일차 수집은 목록→단건 2단계.
  - kosis 키 정상 작동(통합검색). 실데이터는 통계표(orgId/tblId) 선택 후 `statisticsParameterData.do` 호출 필요.
- 미확정: 호출제한(rate limit), 페이지네이션 상한, mpm `type01`/`type02` 의미, kosis 대상 통계표 확정.