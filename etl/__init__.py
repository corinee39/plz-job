"""plz-job DA ETL 패키지 루트.

실행 규칙: 저장소 루트(d:/miniproject/plz-job)에서 `python -m etl.<...>` 로 실행한다.
(예: python -m etl.common.oracle_client)
하위 패키지: config(설정), extract(수집), transform(표준화),
aggregate(집계), load(적재), common(공통: 로거/예외/DB·HDFS 클라이언트), tests.
데이터 파일은 etl/data/ (sample·raw·processed·dict), 노트북은 etl/notebooks/.
"""
