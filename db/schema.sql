--------------------------------------------------------------------------------
-- Plz-Job 스키마 DDL (Oracle XE 21c / 계정 plzjob @ XEPDB1)
--------------------------------------------------------------------------------
-- 기준 문서
--   - docs/plz_job_requirements.md  §10 데이터베이스 요구사항
--   - docs/API_명세서.md            §7 공통 enum
--   - docs/백엔드 설명.md           entity/* (컬럼명·타입·시퀀스의 단일 기준)
--   - docs/DA_7day_plan.md          §4 데이터 계약(analytics 필터 컬럼 권장안)
--   - docs/DB_설계서.md             본 DDL의 설명 문서
--
-- 실행 방법 (DBeaver 또는 sqlplus, plzjob 계정)
--   @db/schema.sql
--
-- 규칙
--   - 식별자(PK): NUMBER, 시퀀스 기반. JPA @SequenceGenerator 이름과 1:1로 맞춤.
--     · BE(JPA write) 테이블 시퀀스는 allocationSize=50 → INCREMENT BY 50
--     · ETL 전용(Python write) 테이블 시퀀스는 INCREMENT BY 1
--   - 감사 컬럼 created_at/updated_at/deleted_at = BaseEntity(@MappedSuperclass).
--     deleted_at 이 있는 테이블만 소프트 삭제(@SQLRestriction) 대상.
--   - LocalDate→DATE, LocalDateTime→TIMESTAMP, boolean→NUMBER(1), @Lob String→CLOB.
--   - 소프트 삭제를 쓰므로 FK 는 ON DELETE CASCADE 를 걸지 않는다(애플리케이션이 관리).
--------------------------------------------------------------------------------

--==============================================================================
-- 0. (재생성용) DROP — 최초 생성 시에는 주석 유지. 재실행이 필요하면 주석 해제.
--==============================================================================
-- BEGIN
--   FOR t IN (SELECT table_name FROM user_tables WHERE table_name IN (
--     'AI_GENERATIONS','RETROSPECTIVES','RECRUITMENT_SCHEDULES','APPLICATION_DOCUMENTS',
--     'DOCUMENT_VERSIONS','DOCUMENTS','APPLICATION_STAGE_HISTORIES','APPLICATIONS',
--     'JOB_POSTINGS','USERS','MARKET_JOB_STACKS','MARKET_JOB_POSTINGS',
--     'ANALYTICS_MONTHLY_JOBS','ANALYTICS_STACK_TRENDS','ANALYTICS_REGION_JOBS','ETL_RUNS'))
--   LOOP EXECUTE IMMEDIATE 'DROP TABLE '||t.table_name||' CASCADE CONSTRAINTS PURGE'; END LOOP;
--   FOR s IN (SELECT sequence_name FROM user_sequences WHERE sequence_name LIKE 'SEQ_%')
--   LOOP EXECUTE IMMEDIATE 'DROP SEQUENCE '||s.sequence_name; END LOOP;
-- END;
-- /

--==============================================================================
-- 1. 시퀀스
--==============================================================================
-- BE(JPA) — allocationSize=50 과 일치시켜 INCREMENT BY 50
CREATE SEQUENCE SEQ_USERS             START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE SEQ_JOB_POSTINGS      START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE SEQ_APPLICATIONS      START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE SEQ_STAGE_HISTORIES   START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE SEQ_DOCUMENTS         START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE SEQ_DOC_VERSIONS      START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE SEQ_APP_DOCS          START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE SEQ_SCHEDULES         START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE SEQ_RETROSPECTIVES    START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE SEQ_AI_GENERATIONS    START WITH 1 INCREMENT BY 50;
-- analytics 2종은 BE 엔티티(allocationSize=50)가 시드용으로 insert → INCREMENT BY 50
CREATE SEQUENCE SEQ_ANALYTICS_STACK   START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE SEQ_ANALYTICS_REGION  START WITH 1 INCREMENT BY 50;
-- ETL 전용(Python) — INCREMENT BY 1
CREATE SEQUENCE SEQ_MARKET_JOBS       START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_MARKET_STACKS     START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_ANALYTICS_MONTHLY START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_ETL_RUNS          START WITH 1 INCREMENT BY 1;

--==============================================================================
-- 2. 사용자 / 계정  (BE)
--==============================================================================
-- USERS — 소셜 전용. §10 user_profiles 는 MVP에서 본 테이블에 통합(프로필 컬럼).
CREATE TABLE USERS (
    id                NUMBER(19)      NOT NULL,
    provider          VARCHAR2(20)    NOT NULL,                 -- KAKAO / GOOGLE
    provider_user_id  VARCHAR2(100)   NOT NULL,                 -- 소셜 고유 식별자
    email             VARCHAR2(100),
    nickname          VARCHAR2(50)    NOT NULL,
    desired_position  VARCHAR2(100),                            -- 프로필(AUTH-05)
    desired_region    VARCHAR2(100),
    tech_stacks       VARCHAR2(1000),                           -- CSV (StringListConverter)
    created_at        TIMESTAMP,
    updated_at        TIMESTAMP,
    deleted_at        TIMESTAMP,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_user_social UNIQUE (provider, provider_user_id)   -- AUTH-02
);
COMMENT ON TABLE  USERS IS '소셜 로그인 사용자(비밀번호 미저장). 프로필 포함.';
COMMENT ON COLUMN USERS.tech_stacks IS '주요 기술스택 CSV. 개인 데이터는 표시용이라 비정규화';

--==============================================================================
-- 3. 공고 / 지원  (BE)
--==============================================================================
-- JOB_POSTINGS — 사용자가 등록한 공고(정적 정보). tech_stacks 는 CSV 컬럼.
CREATE TABLE JOB_POSTINGS (
    id            NUMBER(19)    NOT NULL,
    user_id       NUMBER(19)    NOT NULL,                       -- 소유자(데이터 격리 기준)
    company_name  VARCHAR2(100) NOT NULL,
    title         VARCHAR2(200) NOT NULL,
    url           VARCHAR2(1000),
    position      VARCHAR2(100),                                -- 직무(표준화 전 원문 가능)
    region        VARCHAR2(100),
    start_date    DATE,
    deadline      DATE,
    tech_stacks   VARCHAR2(1000),                               -- CSV
    description   CLOB,
    favorite      NUMBER(1)     DEFAULT 0 NOT NULL,             -- 즐겨찾기(JOB-08)
    created_at    TIMESTAMP,
    updated_at    TIMESTAMP,
    deleted_at    TIMESTAMP,
    CONSTRAINT pk_job_postings PRIMARY KEY (id),
    CONSTRAINT fk_job_postings_user FOREIGN KEY (user_id) REFERENCES USERS (id),
    CONSTRAINT ck_job_postings_fav CHECK (favorite IN (0, 1))
);
CREATE INDEX idx_job_postings_user ON JOB_POSTINGS (user_id);
CREATE INDEX idx_job_postings_dup  ON JOB_POSTINGS (user_id, url);   -- 동일 URL 중복 등록 검사(JOB-09)
COMMENT ON TABLE JOB_POSTINGS IS '사용자가 등록한 채용 공고';

-- APPLICATIONS — 지원 상태(공고 1 : 지원 1). 단계/최종결과 보관.
CREATE TABLE APPLICATIONS (
    id              NUMBER(19)   NOT NULL,
    job_posting_id  NUMBER(19)   NOT NULL,                      -- OneToOne
    user_id         NUMBER(19)   NOT NULL,
    current_stage   VARCHAR2(20) NOT NULL,                      -- ApplicationStage(13종)
    applied_at      TIMESTAMP,                                  -- APPLIED 이상 최초 시각
    final_result    VARCHAR2(20) NOT NULL,                      -- IN_PROGRESS/FINAL_PASS/REJECTED/WITHDRAWN
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP,
    CONSTRAINT pk_applications PRIMARY KEY (id),
    CONSTRAINT uq_applications_job UNIQUE (job_posting_id),
    CONSTRAINT fk_applications_job  FOREIGN KEY (job_posting_id) REFERENCES JOB_POSTINGS (id),
    CONSTRAINT fk_applications_user FOREIGN KEY (user_id)        REFERENCES USERS (id)
);
CREATE INDEX idx_applications_user  ON APPLICATIONS (user_id);
CREATE INDEX idx_applications_stage ON APPLICATIONS (user_id, current_stage);
COMMENT ON TABLE APPLICATIONS IS '공고에 대한 지원 상태(단계/최종결과)';

-- APPLICATION_STAGE_HISTORIES — 단계 변경 이력(JOB-07). BaseEntity 미상속(소프트삭제 없음).
CREATE TABLE APPLICATION_STAGE_HISTORIES (
    id              NUMBER(19)   NOT NULL,
    application_id  NUMBER(19)   NOT NULL,
    from_stage      VARCHAR2(20),                               -- 최초 생성 시 NULL
    to_stage        VARCHAR2(20) NOT NULL,
    changed_at      TIMESTAMP    NOT NULL,
    memo            VARCHAR2(500),
    CONSTRAINT pk_stage_histories PRIMARY KEY (id),
    CONSTRAINT fk_stage_hist_app FOREIGN KEY (application_id) REFERENCES APPLICATIONS (id)
);
CREATE INDEX idx_stage_hist_app ON APPLICATION_STAGE_HISTORIES (application_id, changed_at);
COMMENT ON TABLE APPLICATION_STAGE_HISTORIES IS '지원 단계 변경 이력(append-only)';

--==============================================================================
-- 4. 문서 / 버전  (BE)
--==============================================================================
-- DOCUMENTS — 문서 논리 단위(이력서/자소서).
CREATE TABLE DOCUMENTS (
    id             NUMBER(19)    NOT NULL,
    user_id        NUMBER(19)    NOT NULL,
    document_type  VARCHAR2(20)  NOT NULL,                      -- RESUME / COVER_LETTER
    title          VARCHAR2(200) NOT NULL,
    created_at     TIMESTAMP,
    updated_at     TIMESTAMP,
    deleted_at     TIMESTAMP,
    CONSTRAINT pk_documents PRIMARY KEY (id),
    CONSTRAINT fk_documents_user FOREIGN KEY (user_id) REFERENCES USERS (id)
);
CREATE INDEX idx_documents_user ON DOCUMENTS (user_id);
COMMENT ON TABLE DOCUMENTS IS '문서 논리 단위(여러 버전을 가짐)';

-- DOCUMENT_VERSIONS — 문서 버전 + 파일 메타데이터(원본/추출텍스트 분리, DOC-06).
CREATE TABLE DOCUMENT_VERSIONS (
    id              NUMBER(19)    NOT NULL,
    document_id     NUMBER(19)    NOT NULL,
    version_name    VARCHAR2(50)  NOT NULL,
    description     VARCHAR2(500),
    original_name   VARCHAR2(255),                              -- 사용자 원본 파일명
    stored_name     VARCHAR2(255),                              -- UUID 변환 저장명
    file_path       VARCHAR2(500),
    mime_type       VARCHAR2(100),
    size_bytes      NUMBER(19),
    hash            VARCHAR2(64),                               -- SHA-256
    extracted_text  CLOB,                                       -- 추출 텍스트(원본과 분리)
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP,
    CONSTRAINT pk_doc_versions PRIMARY KEY (id),
    CONSTRAINT fk_doc_versions_doc FOREIGN KEY (document_id) REFERENCES DOCUMENTS (id)
);
CREATE INDEX idx_doc_versions_doc ON DOCUMENT_VERSIONS (document_id);
COMMENT ON TABLE DOCUMENT_VERSIONS IS '문서 버전(파일 메타데이터는 여기, 실제 파일은 로컬/볼륨)';

-- APPLICATION_DOCUMENTS — 지원(공고)에 제출한 문서 버전 연결(DOC-03). BaseEntity 미상속.
CREATE TABLE APPLICATION_DOCUMENTS (
    id              NUMBER(19) NOT NULL,
    application_id  NUMBER(19) NOT NULL,
    version_id      NUMBER(19) NOT NULL,
    CONSTRAINT pk_app_docs PRIMARY KEY (id),
    CONSTRAINT uq_app_doc UNIQUE (application_id, version_id),
    CONSTRAINT fk_app_docs_app FOREIGN KEY (application_id) REFERENCES APPLICATIONS (id),
    CONSTRAINT fk_app_docs_ver FOREIGN KEY (version_id)     REFERENCES DOCUMENT_VERSIONS (id)
);
COMMENT ON TABLE APPLICATION_DOCUMENTS IS '지원-제출문서 버전 연결(M:N 해소)';

--==============================================================================
-- 5. 전형 일정 / 회고  (BE)
--==============================================================================
-- RECRUITMENT_SCHEDULES — 전형 일정(PROC-01·02).
CREATE TABLE RECRUITMENT_SCHEDULES (
    id              NUMBER(19)   NOT NULL,
    application_id  NUMBER(19)   NOT NULL,
    schedule_type   VARCHAR2(20) NOT NULL,                      -- DEADLINE/CODING_TEST/INTERVIEW/ETC
    start_at        TIMESTAMP    NOT NULL,
    memo            VARCHAR2(500),
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP,
    CONSTRAINT pk_schedules PRIMARY KEY (id),
    CONSTRAINT fk_schedules_app FOREIGN KEY (application_id) REFERENCES APPLICATIONS (id)
);
CREATE INDEX idx_schedules_app   ON RECRUITMENT_SCHEDULES (application_id);
CREATE INDEX idx_schedules_start ON RECRUITMENT_SCHEDULES (start_at);   -- 캘린더 기간 조회(PROC-02)
COMMENT ON TABLE RECRUITMENT_SCHEDULES IS '전형 일정(마감/코테/면접 등)';

-- RETROSPECTIVES — 코테/면접 회고(PROC-03·04).
CREATE TABLE RETROSPECTIVES (
    id              NUMBER(19)   NOT NULL,
    application_id  NUMBER(19)   NOT NULL,
    type            VARCHAR2(20) NOT NULL,                      -- CODING_TEST / INTERVIEW
    difficulty      VARCHAR2(20),                               -- EASY / NORMAL / HARD
    content         CLOB         NOT NULL,
    improvement     CLOB,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP,
    CONSTRAINT pk_retrospectives PRIMARY KEY (id),
    CONSTRAINT fk_retrospectives_app FOREIGN KEY (application_id) REFERENCES APPLICATIONS (id)
);
CREATE INDEX idx_retrospectives_app ON RETROSPECTIVES (application_id);
COMMENT ON TABLE RETROSPECTIVES IS '전형 회고(공고/지원 단위)';

--==============================================================================
-- 6. AI 생성 이력  (BE)
--==============================================================================
-- AI_GENERATIONS — LLM 결과 저장(AI-09). 대시보드 리포트는 application_id NULL 가능.
CREATE TABLE AI_GENERATIONS (
    id               NUMBER(19)   NOT NULL,
    user_id          NUMBER(19)   NOT NULL,
    application_id   NUMBER(19),                                -- NULL 가능(대시보드 리포트)
    generation_type  VARCHAR2(30) NOT NULL,                     -- INTERVIEW_QUESTIONS / DASHBOARD_REPORT
    input_hash       VARCHAR2(64),
    response_json    CLOB         NOT NULL,
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    deleted_at       TIMESTAMP,
    CONSTRAINT pk_ai_generations PRIMARY KEY (id),
    CONSTRAINT fk_ai_gen_user FOREIGN KEY (user_id)        REFERENCES USERS (id),
    CONSTRAINT fk_ai_gen_app  FOREIGN KEY (application_id) REFERENCES APPLICATIONS (id)
);
CREATE INDEX idx_ai_gen_lookup ON AI_GENERATIONS (user_id, application_id, generation_type);
COMMENT ON TABLE AI_GENERATIONS IS 'LLM 생성 결과 이력(응답 JSON 원문 보관, 민감원문은 로그 금지)';

--==============================================================================
-- 7. 시장 데이터 (ETL 적재 / BE 읽기 전용)
--==============================================================================
-- MARKET_JOB_POSTINGS — 표준화된 공공 공고. (source, external_id) 멱등 키(ETL-08).
CREATE TABLE MARKET_JOB_POSTINGS (
    id            NUMBER(19)    NOT NULL,
    source        VARCHAR2(50)  NOT NULL,                       -- 출처 코드(work24 등)
    external_id   VARCHAR2(100) NOT NULL,                       -- 외부 공고 ID 또는 URL 해시
    company_name  VARCHAR2(200),
    title         VARCHAR2(300) NOT NULL,
    url           VARCHAR2(1000),
    position      VARCHAR2(50),                                 -- 표준 직무명
    region        VARCHAR2(50),                                 -- 표준 시·도(sido)
    sigungu       VARCHAR2(50),
    posted_date   DATE,
    deadline      DATE,
    collected_at  TIMESTAMP,
    base_date     DATE,
    created_at    TIMESTAMP     DEFAULT SYSTIMESTAMP,
    updated_at    TIMESTAMP     DEFAULT SYSTIMESTAMP,
    CONSTRAINT pk_market_jobs PRIMARY KEY (id),
    CONSTRAINT uq_market_job UNIQUE (source, external_id)
);
CREATE INDEX idx_market_jobs_base ON MARKET_JOB_POSTINGS (base_date);
COMMENT ON TABLE MARKET_JOB_POSTINGS IS '표준화된 공공 채용 공고(Python ETL 적재, BE 읽기 전용)';

-- MARKET_JOB_STACKS — 시장 공고 기술스택(다대다, 집계 대상이라 정규화).
CREATE TABLE MARKET_JOB_STACKS (
    id               NUMBER(19)    NOT NULL,
    market_job_id    NUMBER(19)    NOT NULL,
    stack_name       VARCHAR2(50)  NOT NULL,                    -- 표준 기술스택명
    matched_keyword  VARCHAR2(100),                             -- 원문 매칭 키워드
    CONSTRAINT pk_market_stacks PRIMARY KEY (id),
    CONSTRAINT uq_market_stack UNIQUE (market_job_id, stack_name),
    CONSTRAINT fk_market_stack_job FOREIGN KEY (market_job_id) REFERENCES MARKET_JOB_POSTINGS (id)
);
CREATE INDEX idx_market_stack_name ON MARKET_JOB_STACKS (stack_name);
COMMENT ON TABLE MARKET_JOB_STACKS IS '시장 공고별 기술스택(고유 공고 기준 집계의 원천)';

--==============================================================================
-- 8. 분석 집계 (ETL 적재 / BE 읽기 전용)  — DA 플랜 §4.4 권장안: position·region 필터 컬럼 포함
--   "전체" 집계행은 NULL 대신 'ALL' 센티넬을 사용(Oracle 복합 UNIQUE 가 NULL 을 구분하지 못하므로).
--==============================================================================
-- ANALYTICS_MONTHLY_JOBS — 월별 시장 공고 수.
CREATE TABLE ANALYTICS_MONTHLY_JOBS (
    id             NUMBER(19)   NOT NULL,
    base_month     VARCHAR2(7)  NOT NULL,                       -- 'YYYY-MM'
    position       VARCHAR2(50) DEFAULT 'ALL' NOT NULL,
    region         VARCHAR2(50) DEFAULT 'ALL' NOT NULL,
    posting_count  NUMBER       NOT NULL,
    created_at     TIMESTAMP    DEFAULT SYSTIMESTAMP,
    updated_at     TIMESTAMP    DEFAULT SYSTIMESTAMP,
    CONSTRAINT pk_analytics_monthly PRIMARY KEY (id),
    CONSTRAINT uq_analytics_monthly UNIQUE (base_month, position, region)
);
COMMENT ON TABLE ANALYTICS_MONTHLY_JOBS IS '월별 시장 공고 수 집계';

-- ANALYTICS_STACK_TRENDS — 기술스택 추세(비율). ratio 는 분모 0이면 NULL(데이터 부족).
CREATE TABLE ANALYTICS_STACK_TRENDS (
    id             NUMBER(19)    NOT NULL,
    base_month     VARCHAR2(7)   NOT NULL,
    position       VARCHAR2(50)  DEFAULT 'ALL' NOT NULL,
    region         VARCHAR2(50)  DEFAULT 'ALL' NOT NULL,
    stack_name     VARCHAR2(50)  NOT NULL,
    posting_count  NUMBER        NOT NULL,
    ratio          NUMBER(6,2),                                 -- 시장 비율(%). NULL=분모0
    CONSTRAINT pk_analytics_stack PRIMARY KEY (id),
    CONSTRAINT uq_analytics_stack UNIQUE (base_month, position, region, stack_name)
);
CREATE INDEX idx_analytics_stack_month ON ANALYTICS_STACK_TRENDS (base_month);
COMMENT ON TABLE ANALYTICS_STACK_TRENDS IS '기술스택 추세 집계(/market/stack-trends)';

-- ANALYTICS_REGION_JOBS — 지역별 공고 수(직무 필터 가능).
CREATE TABLE ANALYTICS_REGION_JOBS (
    id             NUMBER(19)   NOT NULL,
    base_month     VARCHAR2(7)  NOT NULL,
    position       VARCHAR2(50) DEFAULT 'ALL' NOT NULL,
    region         VARCHAR2(50) NOT NULL,
    posting_count  NUMBER       NOT NULL,
    CONSTRAINT pk_analytics_region PRIMARY KEY (id),
    CONSTRAINT uq_analytics_region UNIQUE (base_month, position, region)
);
CREATE INDEX idx_analytics_region_month ON ANALYTICS_REGION_JOBS (base_month);
COMMENT ON TABLE ANALYTICS_REGION_JOBS IS '지역별 시장 공고 수 집계(/market/region-distribution)';

--==============================================================================
-- 9. ETL 실행 이력 (ETL 적재 / BE 는 최신 기준일만 조회 ETL-10)
--==============================================================================
CREATE TABLE ETL_RUNS (
    id               NUMBER(19)    NOT NULL,
    source           VARCHAR2(50)  NOT NULL,
    started_at       TIMESTAMP     NOT NULL,
    ended_at         TIMESTAMP,
    status           VARCHAR2(20)  NOT NULL,                    -- RUNNING / SUCCESS / FAILED
    extracted_count  NUMBER,
    loaded_count     NUMBER,
    base_date        DATE,                                      -- dataBaseDate 노출용
    error_message    VARCHAR2(2000),
    CONSTRAINT pk_etl_runs PRIMARY KEY (id)
);
CREATE INDEX idx_etl_runs_latest ON ETL_RUNS (status, started_at DESC);
COMMENT ON TABLE ETL_RUNS IS 'ETL 실행 이력(최신 성공의 base_date 를 대시보드 기준일로 노출)';

--------------------------------------------------------------------------------
-- 끝. 검증: SELECT table_name FROM user_tables ORDER BY 1;  (16개)
--------------------------------------------------------------------------------
