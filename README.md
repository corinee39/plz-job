# Plz-Job

2026 자바 개발자 과정 2차 프로젝트 — **개발자 취업 준비생용 취업 공고·지원 기록 및 데이터 분석 플랫폼**

취업 공고와 개인 지원 이력을 한곳에서 관리하고, 공공 채용 데이터를 분석해 시장 동향과 개인 지원 활동을 비교하며, 로컬 LLM(Ollama)으로 예상 면접 질문과 분석 리포트를 생성한다.

## 기술 스택
- **Front-End**: React + JavaScript
- **Back-End**: Spring Boot / Spring Security
- **Database**: Oracle
- **데이터 분석/ETL**: Python · Pandas · Hadoop HDFS
- **로컬 AI**: Ollama 기반 로컬 LLM
- **외부 데이터**: 공공데이터 / Open API

## 문서
| 문서 | 내용 |
|---|---|
| [docs/plz_job_requirements.md](docs/plz_job_requirements.md) | 요구사항 정의서 (단일 기준 문서) |
| [docs/API_명세서.md](docs/API_명세서.md) | REST API 명세 (MVP) |
| [docs/백엔드 설명.md](docs/백엔드%20설명.md) | 백엔드 클론코딩 가이드 (Phase 0~8) |

## 빠른 시작
```bash
# 1) 인프라(Oracle + Ollama) 기동  — 포트: Oracle 1522, Ollama 11435
docker compose up -d
docker compose ps          # oracle 이 (healthy) 될 때까지 대기

# 2) 백엔드 실행
cd backend
./gradlew bootRun
```
- Oracle: `jdbc:oracle:thin:@localhost:1522/XEPDB1` (Service=XEPDB1, 계정 `plzjob` / `.env`의 `DB_PASSWORD`)
- Ollama: `http://localhost:11435`
- 포트·계정은 루트 `.env`로 변경 가능(`.env.example` 참고).

## 모듈 구조
```
plz-job/
├── backend/        Spring Boot REST API (인증·공고·지원·문서·일정·회고·AI·분석 조회)
├── docs/           요구사항·API·백엔드 가이드 문서
├── docker-compose.yml   Oracle + Ollama 로컬 인프라
└── .env.example
```
> 데이터 분석(Python ETL · Hadoop 적재 · Oracle `analytics_*` 집계)은 별도 모듈로 진행하며, 백엔드는 적재된 집계 테이블을 **조회**한다.
