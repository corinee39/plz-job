package com.plzjob.backend.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // 인증/계정
    UNAUTHORIZED(401, "UNAUTHORIZED", "로그인이 필요합니다."),
    INVALID_TOKEN(401, "INVALID_TOKEN", "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(401, "EXPIRED_TOKEN", "만료된 토큰입니다."),
    INVALID_REFRESH_TOKEN(401, "INVALID_REFRESH_TOKEN", "유효하지 않은 리프레시 토큰입니다."),
    INVALID_PROVIDER(400, "INVALID_PROVIDER", "지원하지 않는 소셜 로그인입니다."),
    OAUTH_AUTH_FAILED(401, "OAUTH_AUTH_FAILED", "소셜 인증에 실패했습니다."),
    OAUTH_PROVIDER_ERROR(502, "OAUTH_PROVIDER_ERROR", "소셜 서버 응답 오류입니다."),
    FORBIDDEN(403, "FORBIDDEN", "권한이 없습니다."),
    // 공고/지원
    JOB_POSTING_NOT_FOUND(404, "JOB_POSTING_NOT_FOUND", "공고를 찾을 수 없습니다."),
    APPLICATION_NOT_FOUND(404, "APPLICATION_NOT_FOUND", "지원 기록을 찾을 수 없습니다."),
    DUPLICATE_JOB_URL(409, "DUPLICATE_JOB_URL", "이미 등록한 공고 URL입니다."),
    INVALID_STAGE(422, "INVALID_STAGE", "유효하지 않은 단계입니다."),
    INVALID_URL(400, "INVALID_URL", "유효하지 않은 URL입니다."),
    URL_NOT_ALLOWED(400, "URL_NOT_ALLOWED", "허용되지 않은 URL입니다."),
    CRAWL_BLOCKED(422, "CRAWL_BLOCKED", "자동 수집이 불가한 공고입니다. 수동으로 입력해 주세요."),
    CRAWL_FETCH_FAILED(502, "CRAWL_FETCH_FAILED", "공고 페이지를 불러오지 못했습니다."),
    // 문서
    DOCUMENT_NOT_FOUND(404, "DOCUMENT_NOT_FOUND", "문서를 찾을 수 없습니다."),
    UNSUPPORTED_FILE_TYPE(400, "UNSUPPORTED_FILE_TYPE", "PDF 또는 TXT 파일만 업로드할 수 있습니다."),
    FILE_TOO_LARGE(413, "FILE_TOO_LARGE", "파일 용량이 너무 큽니다."),
    FILE_PROCESS_FAILED(500, "FILE_PROCESS_FAILED", "파일 처리에 실패했습니다."),
    DOCUMENT_TEXT_EMPTY(422, "DOCUMENT_TEXT_EMPTY", "문서에서 텍스트를 추출하지 못했습니다."),
    // 일정/회고
    SCHEDULE_NOT_FOUND(404, "SCHEDULE_NOT_FOUND", "일정을 찾을 수 없습니다."),
    RETROSPECTIVE_NOT_FOUND(404, "RETROSPECTIVE_NOT_FOUND", "회고를 찾을 수 없습니다."),
    // AI
    GENERATION_NOT_FOUND(404, "GENERATION_NOT_FOUND", "AI 생성 이력을 찾을 수 없습니다."),
    LLM_PARSE_FAILED(502, "LLM_PARSE_FAILED", "AI 응답 형식을 해석하지 못했습니다."),
    LLM_UNAVAILABLE(503, "LLM_UNAVAILABLE", "AI 모델에 연결할 수 없습니다."),
    // 공통
    VALIDATION_FAILED(422, "VALIDATION_FAILED", "입력값을 확인해 주세요."),
    INTERNAL_ERROR(500, "INTERNAL_SERVER_ERROR", "서버 오류가 발생했습니다.");

    private final int status;
    private final String code;
    private final String message;
}
