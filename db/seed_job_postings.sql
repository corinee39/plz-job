--------------------------------------------------------------------------------
-- 화면 확인용 더미 시드 — JOB_POSTINGS 약 80건 + 1:1 APPLICATIONS + 단계 이력
--------------------------------------------------------------------------------
-- ⚠️ 이 파일은 PL/SQL 블록을 쓰지 않는 "순수 SQL" 버전이다.
--    (DBeaver/SQL Developer 가 세미콜론 단위로 잘라 실행해도 그대로 동작 →
--     예전 DECLARE/BEGIN 블록에서 나던 ORA-00922 회피)
--    DBeaver: 전체 선택 후 "스크립트 실행"(Alt+X) 권장. sqlplus: @db/seed_job_postings.sql
--
-- 왜 공고만 넣지 않는가?
--   목록/상세/대시보드 화면은 JOB_POSTINGS 가 아니라 APPLICATIONS(지원) 기준으로
--   조회한다(JobPostingService.list = applicationRepository.findByUser). 그래서
--   공고마다 1:1 지원과 단계 이력을 함께 넣고, 데이터는 로그인 user_id 소유로 만든다.
--
-- 귀속 사용자
--   provider_user_id <> 'demo-seed' 인 가장 최근 USERS 행(=실제 로그인 사용자)에 귀속.
--   특정 계정에 넣으려면 세 INSERT 의 (SELECT MAX(id) ...) 를 그 user_id 로 바꾼다.
--   (USERS 가 비어 있으면 먼저 한 번 로그인해 사용자 행을 만들어야 한다.)
--
-- id 규칙: 시퀀스(소형 id)와 충돌하지 않도록 9_000_000 대 고정 id. 재실행 가능.
--------------------------------------------------------------------------------

-- 1) 기존 시드 정리(재실행 대비). 자식 → 부모 순.
DELETE FROM APPLICATION_STAGE_HISTORIES WHERE id >= 9500000 AND id < 9600000;
DELETE FROM RECRUITMENT_SCHEDULES       WHERE id >= 9600000;
DELETE FROM APPLICATIONS               WHERE id >= 9000000 AND id < 9500000;
DELETE FROM JOB_POSTINGS               WHERE id >= 9000000 AND id < 9500000;

-- 2) 공고 80건
INSERT INTO JOB_POSTINGS
  (id, user_id, company_name, title, url, position, region, start_date, deadline,
   tech_stacks, description, favorite, created_at, updated_at)
WITH g AS (
  SELECT i,
    (SELECT MAX(id) FROM USERS WHERE provider_user_id <> 'demo-seed') AS owner_id,
    CASE MOD(i,20)
      WHEN 0 THEN '네이버' WHEN 1 THEN '카카오' WHEN 2 THEN '라인' WHEN 3 THEN '쿠팡'
      WHEN 4 THEN '우아한형제들' WHEN 5 THEN '토스' WHEN 6 THEN '당근마켓' WHEN 7 THEN '야놀자'
      WHEN 8 THEN '마켓컬리' WHEN 9 THEN '무신사' WHEN 10 THEN '하이퍼커넥트' WHEN 11 THEN '뱅크샐러드'
      WHEN 12 THEN '리디' WHEN 13 THEN '클래스101' WHEN 14 THEN '오늘의집' WHEN 15 THEN '직방'
      WHEN 16 THEN '센드버드' WHEN 17 THEN '왓챠' WHEN 18 THEN '버즈빌' ELSE '스푼라디오' END AS company,
    CASE MOD(i,9)
      WHEN 0 THEN '백엔드' WHEN 1 THEN '프런트엔드' WHEN 2 THEN '풀스택' WHEN 3 THEN '데이터 엔지니어'
      WHEN 4 THEN 'AI/ML 엔지니어' WHEN 5 THEN 'DevOps' WHEN 6 THEN '안드로이드' WHEN 7 THEN 'iOS'
      ELSE 'QA' END AS position,
    CASE MOD(i*3+1,9)
      WHEN 0 THEN '서울 강남구' WHEN 1 THEN '서울 서초구' WHEN 2 THEN '서울 송파구' WHEN 3 THEN '서울 구로구'
      WHEN 4 THEN '경기 성남시 분당구' WHEN 5 THEN '부산 해운대구' WHEN 6 THEN '대전 유성구'
      WHEN 7 THEN '인천 연수구' ELSE '경기 수원시 영통구' END AS region
  FROM (SELECT LEVEL i FROM dual CONNECT BY LEVEL <= 80)
)
SELECT
  9000000 + i, owner_id, company,
  position || ' 개발자 (경력 ' || (MOD(i,7)+1) || '년)',
  'https://careers.example.com/jobs/' || (9000000 + i),
  position, region, NULL,
  TRUNC(SYSDATE) + (MOD(i,40) - 10),
  CASE position
    WHEN '백엔드'          THEN 'Java,Spring Boot,Oracle,JPA'
    WHEN '프런트엔드'      THEN 'React,TypeScript,Next.js'
    WHEN '풀스택'          THEN 'Java,Spring Boot,React,TypeScript'
    WHEN '데이터 엔지니어' THEN 'Python,Spark,Airflow,SQL'
    WHEN 'AI/ML 엔지니어'  THEN 'Python,PyTorch,TensorFlow'
    WHEN 'DevOps'          THEN 'Kubernetes,Docker,AWS,Terraform'
    WHEN '안드로이드'      THEN 'Kotlin,Android,Coroutines'
    WHEN 'iOS'             THEN 'Swift,SwiftUI'
    ELSE                        'Java,Selenium,JUnit' END,
  company || ' ' || position || ' 포지션 채용 공고(시드 더미 데이터).',
  CASE WHEN MOD(i,5) = 0 THEN 1 ELSE 0 END,
  SYSTIMESTAMP, SYSTIMESTAMP
FROM g;

-- 3) 지원 80건 (공고와 1:1). 단계는 MOD(i,13) 으로 13단계 고루 분포.
INSERT INTO APPLICATIONS
  (id, job_posting_id, user_id, current_stage, applied_at, final_result, created_at, updated_at)
WITH g AS (
  SELECT i,
    (SELECT MAX(id) FROM USERS WHERE provider_user_id <> 'demo-seed') AS owner_id,
    SYSTIMESTAMP - NUMTODSINTERVAL(MOD(i*7,170)+5, 'DAY') AS v_start,
    CASE MOD(i,13)
      WHEN 0 THEN 'INTERESTED' WHEN 1 THEN 'PLANNED' WHEN 2 THEN 'APPLIED'
      WHEN 3 THEN 'DOCUMENT_PASS' WHEN 4 THEN 'DOCUMENT_FAIL' WHEN 5 THEN 'CODING_TEST'
      WHEN 6 THEN 'CODING_PASS' WHEN 7 THEN 'CODING_FAIL' WHEN 8 THEN 'INTERVIEW'
      WHEN 9 THEN 'INTERVIEW_PASS' WHEN 10 THEN 'INTERVIEW_FAIL' WHEN 11 THEN 'FINAL_PASS'
      ELSE 'WITHDRAWN' END AS stage
  FROM (SELECT LEVEL i FROM dual CONNECT BY LEVEL <= 80)
)
SELECT
  9000000 + i, 9000000 + i, owner_id, stage,
  -- APPLIED 는 모든 경로에서 3번째 단계 → 시작 + 4일. INTERESTED/PLANNED 는 미지원(NULL).
  CASE WHEN stage IN ('INTERESTED','PLANNED') THEN NULL
       ELSE v_start + NUMTODSINTERVAL(4,'DAY') END,
  CASE WHEN stage = 'FINAL_PASS' THEN 'FINAL_PASS'
       WHEN stage IN ('DOCUMENT_FAIL','CODING_FAIL','INTERVIEW_FAIL') THEN 'REJECTED'
       WHEN stage = 'WITHDRAWN' THEN 'WITHDRAWN'
       ELSE 'IN_PROGRESS' END,
  v_start, SYSTIMESTAMP
FROM g;

-- 4) 단계 이력 (지원당 경로를 펼침: 첫 단계 from=NULL, 단계마다 +2일)
INSERT INTO APPLICATION_STAGE_HISTORIES
  (id, application_id, from_stage, to_stage, changed_at, memo)
WITH g AS (
  SELECT i,
    SYSTIMESTAMP - NUMTODSINTERVAL(MOD(i*7,170)+5, 'DAY') AS v_start,
    CASE MOD(i,13)
      WHEN 0 THEN 'INTERESTED' WHEN 1 THEN 'PLANNED' WHEN 2 THEN 'APPLIED'
      WHEN 3 THEN 'DOCUMENT_PASS' WHEN 4 THEN 'DOCUMENT_FAIL' WHEN 5 THEN 'CODING_TEST'
      WHEN 6 THEN 'CODING_PASS' WHEN 7 THEN 'CODING_FAIL' WHEN 8 THEN 'INTERVIEW'
      WHEN 9 THEN 'INTERVIEW_PASS' WHEN 10 THEN 'INTERVIEW_FAIL' WHEN 11 THEN 'FINAL_PASS'
      ELSE 'WITHDRAWN' END AS stage
  FROM (SELECT LEVEL i FROM dual CONNECT BY LEVEL <= 80)
),
p AS (
  SELECT i, v_start,
    CASE stage
      WHEN 'INTERESTED'     THEN 'INTERESTED'
      WHEN 'PLANNED'        THEN 'INTERESTED,PLANNED'
      WHEN 'APPLIED'        THEN 'INTERESTED,PLANNED,APPLIED'
      WHEN 'DOCUMENT_PASS'  THEN 'INTERESTED,PLANNED,APPLIED,DOCUMENT_PASS'
      WHEN 'DOCUMENT_FAIL'  THEN 'INTERESTED,PLANNED,APPLIED,DOCUMENT_FAIL'
      WHEN 'CODING_TEST'    THEN 'INTERESTED,PLANNED,APPLIED,DOCUMENT_PASS,CODING_TEST'
      WHEN 'CODING_PASS'    THEN 'INTERESTED,PLANNED,APPLIED,DOCUMENT_PASS,CODING_TEST,CODING_PASS'
      WHEN 'CODING_FAIL'    THEN 'INTERESTED,PLANNED,APPLIED,DOCUMENT_PASS,CODING_TEST,CODING_FAIL'
      WHEN 'INTERVIEW'      THEN 'INTERESTED,PLANNED,APPLIED,DOCUMENT_PASS,CODING_TEST,CODING_PASS,INTERVIEW'
      WHEN 'INTERVIEW_PASS' THEN 'INTERESTED,PLANNED,APPLIED,DOCUMENT_PASS,CODING_TEST,CODING_PASS,INTERVIEW,INTERVIEW_PASS'
      WHEN 'INTERVIEW_FAIL' THEN 'INTERESTED,PLANNED,APPLIED,DOCUMENT_PASS,CODING_TEST,CODING_PASS,INTERVIEW,INTERVIEW_FAIL'
      WHEN 'FINAL_PASS'     THEN 'INTERESTED,PLANNED,APPLIED,DOCUMENT_PASS,CODING_TEST,CODING_PASS,INTERVIEW,INTERVIEW_PASS,FINAL_PASS'
      ELSE                       'INTERESTED,PLANNED,APPLIED,WITHDRAWN' END AS path
  FROM g
),
steps AS (SELECT LEVEL j FROM dual CONNECT BY LEVEL <= 9)
SELECT
  9500000 + (p.i - 1) * 9 + s.j,
  9000000 + p.i,
  CASE WHEN s.j = 1 THEN NULL ELSE REGEXP_SUBSTR(p.path, '[^,]+', 1, s.j - 1) END,
  REGEXP_SUBSTR(p.path, '[^,]+', 1, s.j),
  p.v_start + NUMTODSINTERVAL((s.j - 1) * 2, 'DAY'),
  '시드 데이터'
FROM p CROSS JOIN steps s
WHERE s.j <= REGEXP_COUNT(p.path, ',') + 1;

-- 5) 일정(달력 확인용) — 짝수 i 의 지원에 1건씩, 이번 달 전후(-10~+24일)로 분포.
INSERT INTO RECRUITMENT_SCHEDULES
  (id, application_id, schedule_type, start_at, memo, created_at, updated_at)
SELECT
  9600000 + i, 9000000 + i,
  CASE MOD(i,8) WHEN 0 THEN 'INTERVIEW' WHEN 2 THEN 'CODING_TEST'
                WHEN 4 THEN 'DEADLINE'  ELSE 'ETC' END,
  SYSTIMESTAMP + NUMTODSINTERVAL(MOD(i,35) - 10, 'DAY') + NUMTODSINTERVAL(10, 'HOUR'),
  CASE MOD(i,8) WHEN 0 THEN '1차 면접' WHEN 2 THEN '코딩테스트'
                WHEN 4 THEN '서류 마감' ELSE '전형 일정' END,
  SYSTIMESTAMP, SYSTIMESTAMP
FROM (SELECT LEVEL i FROM dual CONNECT BY LEVEL <= 80)
WHERE MOD(i, 2) = 0;

COMMIT;
