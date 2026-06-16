# API 명세서

**프로젝트명:** Plz-Job — 개발자 취업 준비생용 취업 공고·지원 기록 및 데이터 분석 플랫폼
**문서 버전:** v2.0
**작성일:** 2026-06-16
**문서 상태:** 초안(Draft)
**기준 문서:** `docs/plz_job_requirements.md`

> 본 명세서는 요구사항 정의서의 **1주일 MVP** 범위(§4.1, §20)를 대상으로 하며, §11(API 초안)·§10(데이터 모델)을 상세화한 것이다.
> 각 엔드포인트에 대응 요구사항 ID(AUTH-/JOB-/DOC-/PROC-/DASH-/AI-/ETL-/CRAWL-)를 병기한다.
> 스택: Spring Boot / Oracle / Python·Hadoop(ETL) / Ollama(로컬 LLM).

---

## 1. 개요

### 1.1 도메인 ↔ 요구사항 매핑
| 도메인 | 대응 요구사항 |
|---|---|
| 인증·계정 | AUTH-01~06 |
| 공고·지원 기록 | JOB-01~09, CRAWL-01~07 |
| 단계 이력 | JOB-07 |
| 문서·버전 | DOC-01~06 |
| 전형 일정 | PROC-01·02·05 |
| 회고 | PROC-03·04 |
| 대시보드(개인) | DASH-01·02·03·07·08·09 |
| 시장 분석 | DASH-04·05·06, ETL-06·10 |
| AI(LLM) | AI-01~10 |

### 1.2 엔드포인트 요약
| # | 도메인 | Method | Path | 인증 | 요구사항 |
|---|---|---|---|:---:|---|
| 1 | 인증 | GET | `/auth/oauth2/{provider}` | ✕ | AUTH-01 |
| 2 | 인증 | GET | `/auth/oauth2/{provider}/callback` | ✕ | AUTH-01·02 |
| 3 | 인증 | POST | `/auth/reissue` | ✕ | AUTH-03 |
| 4 | 인증 | POST | `/auth/logout` | ○ | AUTH-04 |
| 5 | 계정 | GET | `/users/me` | ○ | AUTH-05 |
| 6 | 계정 | PUT | `/users/me/profile` | ○ | AUTH-05 |
| 7 | 공고 | POST | `/job-postings/preview` | ○ | JOB-01, CRAWL-01~06 |
| 8 | 공고 | POST | `/job-postings` | ○ | JOB-02·03·04·09 |
| 9 | 공고 | GET | `/job-postings` | ○ | JOB-05 |
| 10 | 공고 | GET | `/job-postings/{id}` | ○ | JOB-06 |
| 11 | 공고 | PUT | `/job-postings/{id}` | ○ | JOB-06 |
| 12 | 공고 | DELETE | `/job-postings/{id}` | ○ | JOB-06 |
| 13 | 지원 | PUT | `/applications/{applicationId}/stage` | ○ | JOB-07 |
| 14 | 지원 | GET | `/applications/{applicationId}/stage-histories` | ○ | JOB-07 |
| 15 | 문서 | POST | `/documents` | ○ | DOC-01 |
| 16 | 문서 | GET | `/documents` | ○ | DOC-01 |
| 17 | 문서 | GET | `/documents/{documentId}` | ○ | DOC-02·03 |
| 18 | 문서 | POST | `/documents/{documentId}/versions` | ○ | DOC-01·02·05·06 |
| 19 | 문서 | GET | `/document-versions/{versionId}/download` | ○ | DOC-04 |
| 20 | 문서 | DELETE | `/document-versions/{versionId}` | ○ | DOC-04 |
| 21 | 문서 | POST | `/applications/{applicationId}/documents/{versionId}` | ○ | DOC-03 |
| 22 | 일정 | POST | `/applications/{applicationId}/schedules` | ○ | PROC-01 |
| 23 | 일정 | GET | `/schedules?from=&to=` | ○ | PROC-02·05 |
| 24 | 일정 | PUT | `/schedules/{scheduleId}` | ○ | PROC-01 |
| 25 | 일정 | DELETE | `/schedules/{scheduleId}` | ○ | PROC-01 |
| 26 | 회고 | POST | `/applications/{applicationId}/retrospectives` | ○ | PROC-03·04 |
| 27 | 회고 | GET | `/applications/{applicationId}/retrospectives` | ○ | PROC-04 |
| 28 | 회고 | PUT | `/retrospectives/{retrospectiveId}` | ○ | PROC-03 |
| 29 | 회고 | DELETE | `/retrospectives/{retrospectiveId}` | ○ | PROC-03 |
| 30 | AI | POST | `/ai/applications/{applicationId}/interview-questions` | ○ | AI-02·03·04·06 |
| 31 | AI | POST | `/ai/dashboard-report` | ○ | AI-05·06 |
| 32 | AI | GET | `/ai/generations?applicationId=&type=` | ○ | AI-09 |
| 33 | AI | GET | `/ai/health` | ○ | AI-01 |
| 34 | 대시보드 | GET | `/dashboard/summary?from=&to=` | ○ | DASH-03, ETL-10 |
| 35 | 대시보드 | GET | `/dashboard/monthly-applications?from=&to=` | ○ | DASH-01 |
| 36 | 대시보드 | GET | `/dashboard/stage-conversions?from=&to=` | ○ | DASH-02·03 |
| 37 | 시장 | GET | `/market/stack-trends?from=&to=&position=&region=` | ○ | DASH-04 |
| 38 | 시장 | GET | `/market/region-distribution?from=&to=&position=` | ○ | DASH-05 |
| 39 | 시장 | GET | `/market/user-comparison?from=&to=` | ○ | DASH-06 |

---

## 2. 공통 규약

### 2.1 Base URL
```
https://{host}/api
```
이하 모든 경로는 `/api`를 생략해 표기한다. (예: `POST /auth/logout` = `POST /api/auth/logout`)

### 2.2 인증 방식
- **소셜 로그인 전용**(카카오·구글). 자체 ID/비밀번호 가입은 없다(요구사항 §12.1: 비밀번호 미저장).
- 로그인 성공 시 서버가 **JWT를 HttpOnly·Secure·SameSite 쿠키**(`access_token`, `refresh_token`)로 내려준다.
- 브라우저는 쿠키를 자동 전송한다. 비브라우저 클라이언트(Postman 등)는 `Authorization: Bearer {accessToken}` 헤더도 사용할 수 있다.
- 인증 필요한 API에 토큰이 없거나 만료면 `401`.

### 2.3 데이터 소유권 (AUTH-06)
- 모든 사용자 리소스는 **토큰 주체(userId) 소유분만** 접근 가능.
- URL의 식별자를 바꿔 타인 리소스에 접근 시 `403` 또는 `404`(존재 노출 방지).
- 파일 다운로드·LLM 프롬프트 구성 시에도 소유권을 검증한다.

### 2.4 공통 응답 봉투
모든 응답은 `success / data / error / timestamp` 형식을 따른다. (요구사항 §11 공통 응답)

**성공**
```json
{
  "success": true,
  "data": { },
  "error": null,
  "timestamp": "2026-06-16T15:00:00+09:00"
}
```
**실패**
```json
{
  "success": false,
  "data": null,
  "error": { "code": "JOB_POSTING_NOT_FOUND", "message": "공고를 찾을 수 없습니다." },
  "timestamp": "2026-06-16T15:00:00+09:00"
}
```

### 2.5 페이지네이션 (§12.2)
목록 API는 페이지네이션을 적용한다.

| 쿼리 | 타입 | 기본 | 설명 |
|---|---|---|---|
| `page` | int | 0 | 0-base 페이지 |
| `size` | int | 20 | 페이지 크기(최대 100) |
| `sort` | string | 도메인 기본 | `필드,asc|desc` |

페이지 응답 `data`:
```json
{ "content": [ ], "page": 0, "size": 20, "totalElements": 42, "totalPages": 3, "first": true, "last": false }
```

### 2.6 LLM(AI) 요청 처리 (§12.2·12.3)
- LLM 생성은 일반 API와 분리해 **로딩 상태·타임아웃**을 처리한다(동기 요청, 응답 지연 가능).
- 응답은 항상 **구조화 JSON**(AI-06). 파싱 실패 시 **1회 재시도 후 오류 응답**(AI-07, §14).
- 생성 결과는 저장되어 다시 조회 가능(AI-09).
- Ollama 장애가 CRUD 전체 장애로 이어지지 않는다(§12.3).

### 2.7 날짜·시간
- 날짜 `YYYY-MM-DD`, 일시 ISO-8601 KST(`2026-06-16T15:00:00+09:00`).

### 2.8 표준 HTTP 상태코드
| 코드 | 의미 |
|---|---|
| 200 | 조회/수정 성공 |
| 201 | 생성 성공 |
| 204 | 삭제 성공 |
| 400 | 잘못된 요청/URL |
| 401 | 미인증/토큰 만료 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 중복 |
| 422 | 유효성 검증 실패 |
| 502 | 외부 연동(크롤링/Open API/LLM) 실패 |
| 503 | LLM(Ollama) 미실행/일시 중단 |

---

## 3. 인증 흐름 (카카오 · 구글)

지원 provider: **`kakao`, `google`** (그 외 값은 `400 INVALID_PROVIDER`).

```
1. Front → GET /auth/oauth2/{provider}            ← { authorizationUrl }
2. 사용자를 authorizationUrl로 리다이렉트 → 동의
3. provider → redirectUri?code=...
4. Front → GET /auth/oauth2/{provider}/callback?code=...
   ← 200 + Set-Cookie(access_token, refresh_token), body { user, isNewUser }
5. 이후 요청은 쿠키 자동 전송(또는 Authorization: Bearer)
6. access 만료 시 POST /auth/reissue (refresh 쿠키) → 새 토큰
```
- AUTH-02: `(provider, providerUserId)` 조합이 같으면 중복 사용자로 만들지 않고 갱신.

---

## 4. 엔드포인트 상세

---

### 4.1 인증·계정

#### [AUTH] 소셜 로그인 시작
- **설명:** provider 인가 URL 발급 (AUTH-01)
- `GET /auth/oauth2/{provider}` · 인증 ✕

**Path/Query**
| 위치 | 파라미터 | 필수 | 설명 |
|---|---|:---:|---|
| path | `provider` | ○ | `kakao` \| `google` |
| query | `redirectUri` | ✕ | 콜백 프론트 URI(미지정 시 서버 기본값) |

**Response `200`**
```json
{ "success": true, "data": { "provider": "kakao", "authorizationUrl": "https://kauth.kakao.com/oauth/authorize?client_id=...&redirect_uri=...&response_type=code" }, "error": null, "timestamp": "2026-06-16T15:00:00+09:00" }
```
**에러:** `400 INVALID_PROVIDER`

---

#### [AUTH] 소셜 로그인 콜백
- **설명:** 인가 코드로 인증 → 사용자 저장/갱신 → JWT 쿠키 발급 (AUTH-01·02)
- `GET /auth/oauth2/{provider}/callback` · 인증 ✕

**Query:** `code`(○, provider 발급 인가 코드)

**Response `200`** — `Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Lax` (+ refresh_token)
```json
{
  "success": true,
  "data": {
    "user": { "userId": 1001, "nickname": "취준개발자", "provider": "KAKAO" },
    "isNewUser": true
  },
  "error": null,
  "timestamp": "2026-06-16T15:00:00+09:00"
}
```
**에러:** `400 INVALID_PROVIDER` · `401 OAUTH_AUTH_FAILED` · `502 OAUTH_PROVIDER_ERROR`

---

#### [AUTH] 토큰 재발급
- **설명:** refresh 쿠키로 access 재발급 (AUTH-03)
- `POST /auth/reissue` · 인증 ✕ (refresh 쿠키 필요)

**Response `200`** — 새 토큰 쿠키 재설정
```json
{ "success": true, "data": { "reissued": true }, "error": null, "timestamp": "2026-06-16T15:00:00+09:00" }
```
**에러:** `401 INVALID_REFRESH_TOKEN`

---

#### [AUTH] 로그아웃
- `POST /auth/logout` · 인증 ○ (AUTH-04)

**Response `200`** — access/refresh 쿠키 만료(`Max-Age=0`)
```json
{ "success": true, "data": null, "error": null, "timestamp": "2026-06-16T15:00:00+09:00" }
```

---

#### [USER] 내 프로필 조회
- `GET /users/me` · 인증 ○ (AUTH-05)

**Response `200`**
```json
{
  "success": true,
  "data": {
    "userId": 1001, "nickname": "취준개발자", "email": "dev@example.com", "provider": "KAKAO",
    "desiredPosition": "백엔드", "desiredRegion": "서울", "techStacks": ["Java","Spring","Oracle"]
  },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```

---

#### [USER] 프로필 수정
- `PUT /users/me/profile` · 인증 ○ (AUTH-05)

**Request Body**
| 필드 | 타입 | 설명 |
|---|---|---|
| `nickname` | string | 닉네임 |
| `desiredPosition` | string | 희망 직무 |
| `desiredRegion` | string | 희망 지역 |
| `techStacks` | string[] | 주요 기술 스택 |

```json
{ "nickname": "취준개발자", "desiredPosition": "백엔드", "desiredRegion": "서울", "techStacks": ["Java","Spring","PostgreSQL"] }
```
**Response `200`** — 수정된 프로필(조회와 동일 구조)

---

### 4.2 공고·지원 기록

#### [JOB] 공고 자동 입력 미리보기
- **설명:** URL을 검증·파싱하여 추출 결과를 반환(저장 전). Open API 우선, 안 되면 공개 페이지 메타/본문 파싱. (JOB-01, CRAWL-01~06)
- `POST /job-postings/preview` · 인증 ○

**Request Body**
```json
{ "url": "https://careers.example.com/jobs/123" }
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "source": "OPEN_API",
    "sourceUrl": "https://careers.example.com/jobs/123",
    "extracted": {
      "companyName": "예시테크",
      "title": "백엔드 엔지니어",
      "position": "백엔드",
      "region": "서울 강남구",
      "startDate": "2026-06-10",
      "deadline": "2026-07-15",
      "techStacks": ["Java", "Spring Boot", "Oracle"]
    },
    "extractStatus": "PARTIAL",
    "missingFields": ["startDate"]
  },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```
> `extractStatus`: `SUCCESS` | `PARTIAL` | `FAILED`. 실패/부분 실패면 클라이언트가 **수동 입력(JOB-04)** 으로 보완.

**에러**
| 상태 | code | 설명 |
|---|---|---|
| 400 | `INVALID_URL` | 형식 오류 |
| 400 | `URL_NOT_ALLOWED` | 사설 IP/localhost/file 스킴 등 차단(SSRF, CRAWL-06) |
| 422 | `CRAWL_BLOCKED` | 로그인/캡차 필요 등 수집 제외 대상(CRAWL-05) → 수동 입력 |
| 502 | `CRAWL_FETCH_FAILED` | 페이지 fetch 실패 |

---

#### [JOB] 공고 등록
- **설명:** 공고 저장(자동 추출값 또는 수동 입력). 저장 시 지원(application)이 함께 생성된다. (JOB-02·03·04·09)
- `POST /job-postings` · 인증 ○

**Request Body**
| 필드 | 타입 | 필수 | 설명 |
|---|---|:---:|---|
| `companyName` | string | ○ | 회사명 |
| `title` | string | ○ | 공고명 |
| `url` | string | ✕ | 공고 URL |
| `position` | string | ✕ | 직무(표준화 전 원문 가능) |
| `region` | string | ✕ | 지역 |
| `startDate` | date | ✕ | 공고 시작일 |
| `deadline` | date | ✕ | 마감일 |
| `techStacks` | string[] | ✕ | 기술 스택 |
| `description` | string | ✕ | 공고 본문 |
| `initialStage` | enum | ✕ | 초기 단계(기본 `INTERESTED`) |
| `confirmDuplicate` | bool | ✕ | 동일 URL 중복 등록 강행 여부(JOB-09) |

```json
{
  "companyName": "예시테크", "title": "백엔드 엔지니어", "url": "https://careers.example.com/jobs/123",
  "position": "백엔드", "region": "서울 강남구", "deadline": "2026-07-15",
  "techStacks": ["Java","Spring Boot"], "initialStage": "APPLIED"
}
```

**Response `201`**
```json
{
  "success": true,
  "data": { "jobPostingId": 5001, "applicationId": 7001, "companyName": "예시테크", "title": "백엔드 엔지니어", "currentStage": "APPLIED" },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```

**에러**
| 상태 | code | 설명 |
|---|---|---|
| 409 | `DUPLICATE_JOB_URL` | 동일 URL 기존 등록 존재(JOB-09). `confirmDuplicate=true`로 재요청 시 저장 |
| 422 | `VALIDATION_FAILED` | 필수 필드 누락 |

---

#### [JOB] 공고 목록
- `GET /job-postings` · 인증 ○ (JOB-05)

**Query**
| 파라미터 | 설명 |
|---|---|
| `stage` | 단계 필터(지원 단계 코드) |
| `company` | 회사명 검색 |
| `position` | 직무 |
| `from`,`to` | 등록/지원 기간 |
| `favorite` | 즐겨찾기만(JOB-08, 하) |
| `page`,`size`,`sort` | 페이지네이션(기본 `appliedAt,desc`) |

**Response `200`** (페이지 응답)
```json
{
  "success": true,
  "data": {
    "content": [
      { "jobPostingId": 5001, "applicationId": 7001, "companyName": "예시테크", "title": "백엔드 엔지니어",
        "position": "백엔드", "region": "서울", "deadline": "2026-07-15", "currentStage": "INTERVIEW",
        "finalResult": "IN_PROGRESS", "favorite": false }
    ],
    "page": 0, "size": 20, "totalElements": 12, "totalPages": 1, "first": true, "last": true
  },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```

---

#### [JOB] 공고 상세 / 수정 / 삭제
- `GET·PUT·DELETE /job-postings/{id}` · 인증 ○ (JOB-06, 본인 소유만)

**GET `200`**
```json
{
  "success": true,
  "data": {
    "jobPostingId": 5001, "applicationId": 7001,
    "companyName": "예시테크", "title": "백엔드 엔지니어", "url": "https://careers.example.com/jobs/123",
    "position": "백엔드", "region": "서울 강남구", "startDate": "2026-06-10", "deadline": "2026-07-15",
    "techStacks": ["Java","Spring Boot"], "description": "주요업무 ...",
    "currentStage": "INTERVIEW", "finalResult": "IN_PROGRESS", "favorite": false,
    "submittedDocuments": [ { "versionId": 3101, "documentTitle": "백엔드 이력서", "versionName": "v2" } ],
    "schedules": [ { "scheduleId": 9001, "scheduleType": "INTERVIEW", "startAt": "2026-06-25T14:00:00+09:00" } ],
    "retrospectives": [ { "retrospectiveId": 9501, "type": "INTERVIEW" } ]
  },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```
**PUT** — Request는 등록과 동일 필드(부분 수정). **Response `200`**(수정된 상세).
**DELETE** — `204 No Content` (소프트 삭제).
**에러:** `403 FORBIDDEN` / `404 JOB_POSTING_NOT_FOUND`

---

#### [APP] 지원 단계 변경
- **설명:** 지원 단계 변경 + 변경 이력 저장 (JOB-07)
- `PUT /applications/{applicationId}/stage` · 인증 ○

**Request Body**
```json
{ "toStage": "INTERVIEW_PASS", "memo": "1차 합격" }
```
**Response `200`**
```json
{
  "success": true,
  "data": { "applicationId": 7001, "fromStage": "INTERVIEW", "currentStage": "INTERVIEW_PASS", "finalResult": "IN_PROGRESS", "changedAt": "2026-06-16T15:00:00+09:00" },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```
> 단계가 `FINAL_PASS`/`*_FAIL`/`WITHDRAWN`이면 `finalResult`가 함께 갱신된다.

**에러:** `422 INVALID_STAGE`(미정의 코드) · `404 APPLICATION_NOT_FOUND`

---

#### [APP] 단계 변경 이력
- `GET /applications/{applicationId}/stage-histories` · 인증 ○ (JOB-07)

**Response `200`**
```json
{
  "success": true,
  "data": [
    { "historyId": 8001, "fromStage": null, "toStage": "APPLIED", "changedAt": "2026-06-16T09:00:00+09:00" },
    { "historyId": 8002, "fromStage": "APPLIED", "toStage": "DOCUMENT_PASS", "changedAt": "2026-06-18T09:00:00+09:00" }
  ],
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```

---

### 4.3 문서·버전

#### [DOC] 문서(논리 단위) 생성
- **설명:** 이력서/자소서 같은 문서의 논리 단위 생성(버전은 별도) (DOC-01·02)
- `POST /documents` · 인증 ○

**Request Body**
```json
{ "documentType": "RESUME", "title": "백엔드 이력서" }
```
**Response `201`**
```json
{ "success": true, "data": { "documentId": 3001, "documentType": "RESUME", "title": "백엔드 이력서" }, "error": null, "timestamp": "2026-06-16T15:00:00+09:00" }
```

---

#### [DOC] 문서 목록 / 상세
- `GET /documents` · 인증 ○ → 문서 목록(각 문서의 최신 버전 요약)
- `GET /documents/{documentId}` · 인증 ○ → 문서 + 버전 목록

**GET /documents/{documentId} `200`**
```json
{
  "success": true,
  "data": {
    "documentId": 3001, "documentType": "RESUME", "title": "백엔드 이력서",
    "versions": [
      { "versionId": 3101, "versionName": "v1", "description": "초안", "fileName": "resume.pdf", "createdAt": "2026-06-16T11:00:00+09:00", "hasExtractedText": true },
      { "versionId": 3102, "versionName": "v2", "description": "경력 보강", "fileName": "resume2.pdf", "createdAt": "2026-06-17T11:00:00+09:00", "hasExtractedText": true }
    ]
  },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```

---

#### [DOC] 버전 업로드 (파일)
- **설명:** PDF/TXT 업로드 → 원본 저장 + 텍스트 추출(분리 저장) (DOC-01·02·05·06)
- `POST /documents/{documentId}/versions` · 인증 ○ · `multipart/form-data`

**Form Data**
| 필드 | 타입 | 필수 | 설명 |
|---|---|:---:|---|
| `file` | file | ○ | **PDF/TXT**, 최대 10MB |
| `versionName` | string | ○ | 버전명(예: v2) |
| `description` | string | ✕ | 설명 |

**Response `201`**
```json
{
  "success": true,
  "data": { "versionId": 3102, "versionName": "v2", "fileName": "resume2.pdf", "mimeType": "application/pdf", "sizeBytes": 245011, "extractStatus": "SUCCESS", "extractedTextLength": 4231 },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```
> 서버는 파일명을 UUID로 변환 저장하고 메타데이터(경로·원본명·MIME·크기·해시)를 Oracle에 저장(§7.3 파일 정책). 텍스트 추출 실패 시 `extractStatus=FAILED`(직접 입력/다른 파일 안내).

**에러**
| 상태 | code | 설명 |
|---|---|---|
| 400 | `UNSUPPORTED_FILE_TYPE` | PDF/TXT 외(확장자+MIME+실제 형식 검증, §12.1) |
| 413 | `FILE_TOO_LARGE` | 10MB 초과 |

---

#### [DOC] 버전 다운로드 / 삭제
- `GET /document-versions/{versionId}/download` · 인증 ○ → 파일 스트림(소유권 검증 후, DOC-04)
- `DELETE /document-versions/{versionId}` · 인증 ○ → `204`
**에러:** `403 FORBIDDEN` / `404 DOCUMENT_NOT_FOUND`

---

#### [DOC] 공고에 제출 문서 연결
- `POST /applications/{applicationId}/documents/{versionId}` · 인증 ○ (DOC-03)

**Response `201`**
```json
{ "success": true, "data": { "applicationId": 7001, "versionId": 3102 }, "error": null, "timestamp": "2026-06-16T15:00:00+09:00" }
```

---

### 4.4 전형 일정·회고

#### [PROC] 전형 일정 등록 / 수정 / 삭제
- `POST /applications/{applicationId}/schedules` · 인증 ○ (PROC-01)
- `PUT·DELETE /schedules/{scheduleId}` · 인증 ○

**Request Body**
| 필드 | 타입 | 필수 | 설명 |
|---|---|:---:|---|
| `scheduleType` | enum | ○ | `DEADLINE` \| `CODING_TEST` \| `INTERVIEW` \| `ETC` |
| `startAt` | datetime | ○ | 시작 일시 |
| `memo` | string | ✕ | 메모 |

**POST Response `201`**
```json
{ "success": true, "data": { "scheduleId": 9001, "scheduleType": "INTERVIEW", "startAt": "2026-06-25T14:00:00+09:00", "memo": "화상" }, "error": null, "timestamp": "2026-06-16T15:00:00+09:00" }
```

#### [PROC] 일정 목록(캘린더)
- `GET /schedules?from=&to=` · 인증 ○ (PROC-02·05)

**Response `200`**
```json
{
  "success": true,
  "data": [
    { "scheduleId": 9001, "applicationId": 7001, "companyName": "예시테크", "scheduleType": "INTERVIEW",
      "startAt": "2026-06-25T14:00:00+09:00", "status": "UPCOMING" }
  ],
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```
> `status`: 현재 날짜 기준 `PAST` | `UPCOMING`(PROC-05).

---

#### [PROC] 회고 작성 / 목록 / 수정 / 삭제
- `POST /applications/{applicationId}/retrospectives` · `GET /applications/{applicationId}/retrospectives` · `PUT·DELETE /retrospectives/{retrospectiveId}` · 인증 ○ (PROC-03·04)

**Request Body**
| 필드 | 타입 | 필수 | 설명 |
|---|---|:---:|---|
| `type` | enum | ○ | `CODING_TEST` \| `INTERVIEW` |
| `difficulty` | enum | ✕ | `EASY` \| `NORMAL` \| `HARD` |
| `content` | string | ○ | 질문/내용 |
| `improvement` | string | ✕ | 개선점 |

**POST Response `201`**
```json
{ "success": true, "data": { "retrospectiveId": 9501, "type": "INTERVIEW", "difficulty": "HARD", "content": "트랜잭션 격리수준 질문", "improvement": "MVCC 복습" }, "error": null, "timestamp": "2026-06-16T15:00:00+09:00" }
```

---

### 4.5 AI (로컬 LLM)

> 수치 계산은 서버/Python이 담당하고, LLM은 **문서 기반 질문 생성·집계 해석**만 한다(§7.6, §12.5). 모든 결과에 AI 생성 안내(disclaimer) 포함(AI-08).

#### [AI] 예상 면접질문 생성
- **설명:** 공고 + 선택한 문서 버전 텍스트로 예상 질문·꼬리질문 생성 (AI-02·03·04·06)
- `POST /ai/applications/{applicationId}/interview-questions` · 인증 ○

**Request Body**
```json
{ "documentVersionId": 3102, "regenerate": false }
```
**Response `200`** (구조화 JSON, 저장됨 → generationId 반환)
```json
{
  "success": true,
  "data": {
    "generationId": 6001,
    "summary": "공고와 지원 서류의 핵심 분석 요약",
    "questions": [
      {
        "category": "TECHNICAL",
        "question": "React 상태 관리 방식을 선택한 기준을 설명해 주세요.",
        "reason": "공고의 React 요구사항과 이력서의 Zustand 경험을 연결한 질문입니다.",
        "followUps": [
          "Context API 대신 Zustand를 사용한 이유는?",
          "상태 관리로 인한 성능 문제를 해결한 경험이 있나요?"
        ]
      }
    ],
    "disclaimer": "AI가 생성한 연습용 질문이며 실제 면접 질문을 보장하지 않습니다."
  },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```
> `category`: `TECHNICAL` | `PROJECT` | `PROBLEM_SOLVING` | `PERSONALITY`(AI-04). 최소 질문 5개, 질문별 꼬리질문 ≥1(AI-02·03).

**에러**
| 상태 | code | 설명 |
|---|---|---|
| 422 | `DOCUMENT_TEXT_EMPTY` | 추출 텍스트 없음(다른 파일/직접 입력 안내) |
| 502 | `LLM_PARSE_FAILED` | JSON 파싱 1회 재시도 후 실패(AI-07) |
| 503 | `LLM_UNAVAILABLE` | Ollama 미실행(§14) |

---

#### [AI] 대시보드 리포트 해석
- **설명:** 서버가 계산한 **집계값만** LLM에 전달해 자연어 리포트 생성 (AI-05·06, §7.6 입력 원칙)
- `POST /ai/dashboard-report` · 인증 ○

**Request Body** (조회 조건; 서버가 집계 후 LLM에 전달)
```json
{ "from": "2026-04-01", "to": "2026-06-30", "position": "백엔드", "region": "서울" }
```
**Response `200`**
```json
{
  "success": true,
  "data": {
    "generationId": 6101,
    "report": {
      "keyChanges": "최근 3개월 지원이 증가했고 서류 통과율이 개선되었습니다.",
      "userVsMarket": "시장은 Kubernetes 수요가 높지만 본인 지원 공고에는 비중이 낮습니다.",
      "cautions": "표본이 12건으로 적어 비율 해석에 주의가 필요합니다."
    },
    "disclaimer": "AI가 생성한 분석이며 정확성을 보장하지 않습니다."
  },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```

---

#### [AI] 생성 이력 조회
- `GET /ai/generations?applicationId=&type=` · 인증 ○ (AI-09)
- `type`: `INTERVIEW_QUESTIONS` | `DASHBOARD_REPORT`

**Response `200`**
```json
{
  "success": true,
  "data": [
    { "generationId": 6001, "type": "INTERVIEW_QUESTIONS", "applicationId": 7001, "createdAt": "2026-06-16T12:00:00+09:00" }
  ],
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```

---

#### [AI] LLM 상태 확인
- `GET /ai/health` · 인증 ○ (AI-01)

**Response `200`**
```json
{ "success": true, "data": { "ollama": "UP", "model": "gemma3:4b" }, "error": null, "timestamp": "2026-06-16T15:00:00+09:00" }
```
> Ollama 미실행 시 `data.ollama: "DOWN"`(또는 `503 LLM_UNAVAILABLE`).

---

### 4.6 대시보드 (개인 지원)

> 모든 집계는 인증 사용자 본인의 지원 기록 대상. 응답에 `dataBaseDate`(시장 집계 기준일, ETL-10)와 표본 수를 포함한다. 분모가 0이면 비율 대신 데이터 부족을 표시(§7.5).

#### [DASH] 요약 KPI
- `GET /dashboard/summary?from=&to=` · 인증 ○ (DASH-03, ETL-10)

**Response `200`**
```json
{
  "success": true,
  "data": {
    "thisMonthApplications": 8,
    "inProgressCount": 6,
    "upcomingSchedules": 3,
    "finalPassCount": 1,
    "overallPassRate": 12.5,
    "sampleSize": 30,
    "dataBaseDate": "2026-06-16"
  },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```

#### [DASH] 월별 지원 추이
- `GET /dashboard/monthly-applications?from=&to=` · 인증 ○ (DASH-01)

**Response `200`**
```json
{
  "success": true,
  "data": { "monthly": [ { "month": "2026-04", "applied": 8 }, { "month": "2026-05", "applied": 12 }, { "month": "2026-06", "applied": 10 } ] },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```
> 월별 지원 수 = 해당 월에 `APPLIED` 이상 상태로 변경한 공고 수(§7.5 지표 정의).

#### [DASH] 단계별 전환율(퍼널)
- `GET /dashboard/stage-conversions?from=&to=` · 인증 ○ (DASH-02·03)

**Response `200`**
```json
{
  "success": true,
  "data": {
    "stages": [
      { "stage": "APPLIED", "count": 30 },
      { "stage": "DOCUMENT", "count": 30, "passed": 18, "passRate": 60.0 },
      { "stage": "CODING_TEST", "count": 18, "passed": 10, "passRate": 55.6 },
      { "stage": "INTERVIEW", "count": 10, "passed": 6, "passRate": 60.0 },
      { "stage": "FINAL", "count": 6, "passed": 1, "passRate": 16.7 }
    ],
    "note": "결과가 확정된 지원만 분모에 포함"
  },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```

---

### 4.7 시장 분석 (공공데이터 집계)

> Oracle 분석 테이블(`analytics_*`)을 조회한다(원본 HDFS 실시간 조회 금지, §12.2). 응답에 `dataBaseDate`·표본 포함.

#### [MKT] 기술스택 추세
- `GET /market/stack-trends?from=&to=&position=&region=` · 인증 ○ (DASH-04)

**Response `200`**
```json
{
  "success": true,
  "data": {
    "dataBaseDate": "2026-06-16",
    "trends": [
      { "stack": "Java", "postingCount": 1240, "ratio": 22.0 },
      { "stack": "Spring", "postingCount": 1100, "ratio": 19.5 },
      { "stack": "Kubernetes", "postingCount": 870, "ratio": 15.4 }
    ]
  },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```

#### [MKT] 지역별 분포
- `GET /market/region-distribution?from=&to=&position=` · 인증 ○ (DASH-05)

**Response `200`**
```json
{
  "success": true,
  "data": {
    "dataBaseDate": "2026-06-16",
    "regions": [ { "region": "서울", "postingCount": 5200 }, { "region": "경기", "postingCount": 2100 }, { "region": "부산", "postingCount": 640 } ]
  },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```

#### [MKT] 개인 vs 시장 비교
- `GET /market/user-comparison?from=&to=` · 인증 ○ (DASH-06)

**Response `200`**
```json
{
  "success": true,
  "data": {
    "dataBaseDate": "2026-06-16",
    "comparison": [
      { "stack": "Java", "userRatio": 40.0, "marketRatio": 22.0, "gap": 18.0 },
      { "stack": "Kubernetes", "userRatio": 5.0, "marketRatio": 15.4, "gap": -10.4 }
    ]
  },
  "error": null, "timestamp": "2026-06-16T15:00:00+09:00"
}
```
> `gap = userRatio - marketRatio`. 음수면 시장 수요 대비 본인 지원 비중이 낮은 영역.

---

## 5. 공통 에러코드 표

| HTTP | code | 설명 |
|---|---|---|
| 400 | `BAD_REQUEST` | 잘못된 요청 |
| 400 | `INVALID_URL` | URL 형식 오류 |
| 400 | `URL_NOT_ALLOWED` | SSRF 차단(사설IP/localhost/file 등) |
| 400 | `INVALID_PROVIDER` | 미지원 소셜 provider(`kakao`/`google`만) |
| 400 | `UNSUPPORTED_FILE_TYPE` | PDF/TXT 외 형식 |
| 401 | `UNAUTHORIZED` | 미인증/토큰 만료 |
| 401 | `INVALID_REFRESH_TOKEN` | 리프레시 토큰 무효 |
| 401 | `OAUTH_AUTH_FAILED` | 소셜 인증 실패 |
| 403 | `FORBIDDEN` | 권한 없음(타 사용자 리소스) |
| 404 | `JOB_POSTING_NOT_FOUND` | 공고 없음 |
| 404 | `APPLICATION_NOT_FOUND` | 지원 기록 없음 |
| 404 | `DOCUMENT_NOT_FOUND` | 문서/버전 없음 |
| 404 | `SCHEDULE_NOT_FOUND` | 일정 없음 |
| 404 | `RETROSPECTIVE_NOT_FOUND` | 회고 없음 |
| 404 | `GENERATION_NOT_FOUND` | AI 생성 이력 없음 |
| 409 | `DUPLICATE_JOB_URL` | 동일 URL 중복 등록 |
| 413 | `FILE_TOO_LARGE` | 파일 용량 초과 |
| 422 | `VALIDATION_FAILED` | 입력 유효성 실패 |
| 422 | `INVALID_STAGE` | 미정의 단계 코드 |
| 422 | `CRAWL_BLOCKED` | 수집 제외 대상(로그인/캡차 등) |
| 422 | `DOCUMENT_TEXT_EMPTY` | 추출 텍스트 없음 |
| 502 | `CRAWL_FETCH_FAILED` | 공고 페이지 fetch 실패 |
| 502 | `OAUTH_PROVIDER_ERROR` | 소셜 서버 오류 |
| 502 | `EXTERNAL_API_ERROR` | 공공 API 연동 실패 |
| 502 | `LLM_PARSE_FAILED` | LLM JSON 파싱 실패(재시도 후) |
| 503 | `LLM_UNAVAILABLE` | Ollama 미실행/일시 중단 |
| 500 | `INTERNAL_SERVER_ERROR` | 서버 오류 |

**에러 응답 예시**
```json
{
  "success": false, "data": null,
  "error": { "code": "VALIDATION_FAILED", "message": "회사명을 입력해 주세요." },
  "timestamp": "2026-06-16T15:00:00+09:00"
}
```

---

## 6. 데이터 모델 ↔ API 매핑 (요구사항 §10)

| 테이블 | 대응 API |
|---|---|
| `users`, `user_profiles` | `/auth/*`, `/users/me`, `/users/me/profile` |
| `job_postings`, `job_posting_stacks` | `/job-postings/*` |
| `applications`, `application_stage_histories` | `/job-postings`(생성 시 동반), `/applications/{id}/stage`, `/applications/{id}/stage-histories` |
| `documents`, `document_versions`, `application_documents` | `/documents/*`, `/document-versions/*`, `/applications/{id}/documents/{versionId}` |
| `recruitment_schedules` | `/applications/{id}/schedules`, `/schedules/*` |
| `retrospectives` | `/applications/{id}/retrospectives`, `/retrospectives/*` |
| `ai_generations` | `/ai/*` |
| `market_job_postings`, `market_job_stacks`, `analytics_monthly_jobs`, `analytics_stack_trends`, `analytics_region_jobs` | `/dashboard/*`, `/market/*` (Python ETL이 적재) |
| `etl_runs` | `dataBaseDate`로 노출(ETL-10) |

> 시장/분석 테이블은 **Python ETL**(Open API → HDFS Raw/Processed → 집계 → Oracle `analytics_*`)이 적재하며, 본 API는 **조회만** 한다.

---

## 7. 부록 — 공통 enum

| 구분 | 값 |
|---|---|
| 소셜 provider | `kakao`, `google` |
| 지원 단계(stage) | `INTERESTED`, `PLANNED`, `APPLIED`, `DOCUMENT_PASS`, `DOCUMENT_FAIL`, `CODING_TEST`, `CODING_PASS`, `CODING_FAIL`, `INTERVIEW`, `INTERVIEW_PASS`, `INTERVIEW_FAIL`, `FINAL_PASS`, `WITHDRAWN` |
| 최종 결과(finalResult) | `IN_PROGRESS`, `FINAL_PASS`, `REJECTED`, `WITHDRAWN` |
| 문서 유형 | `RESUME`, `COVER_LETTER` |
| 파일 형식 | `PDF`, `TXT` |
| 일정 유형 | `DEADLINE`, `CODING_TEST`, `INTERVIEW`, `ETC` |
| 일정 상태 | `PAST`, `UPCOMING` |
| 회고 유형 | `CODING_TEST`, `INTERVIEW` |
| 난이도 | `EASY`, `NORMAL`, `HARD` |
| AI 질문 카테고리 | `TECHNICAL`, `PROJECT`, `PROBLEM_SOLVING`, `PERSONALITY` |
| AI 생성 유형 | `INTERVIEW_QUESTIONS`, `DASHBOARD_REPORT` |

---

> **변경 이력**
> | 버전 | 일자 | 내용 |
> |---|---|---|
> | v2.0 | 2026-06-16 | Plz-Job 요구사항(`plz_job_requirements.md`) 기준 전면 개정 — 소셜 전용 인증, 상세 단계 코드, 단계 이력·일정·회고·문서 버전, AI 리포트, 대시보드/시장 분석(ETL 집계 조회), `/api` 베이스·`timestamp` 봉투 반영 |
> | v1.0 | 2026-06-16 | 초안(DevTrack, `요구사항_정의서.md` 기반) |
