package com.plzjob.backend.common;

import lombok.Getter;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Getter
public class ApiResponse<T> {

    private final boolean success;
    private final T data;
    private final ErrorInfo error;
    private final String timestamp;

    private ApiResponse(boolean success, T data, ErrorInfo error) {
        this.success = success;
        this.data = data;
        this.error = error;
        this.timestamp = OffsetDateTime.now(ZoneOffset.ofHours(9)).toString();
    }

    public static <T> ApiResponse<T> ok(T data) { return new ApiResponse<>(true, data, null); }
    public static ApiResponse<Void> ok()        { return new ApiResponse<>(true, null, null); }
    public static ApiResponse<Void> fail(String code, String message) {
        return new ApiResponse<>(false, null, new ErrorInfo(code, message));
    }

    @Getter
    public static class ErrorInfo {
        private final String code;
        private final String message;
        public ErrorInfo(String code, String message) { this.code = code; this.message = message; }
    }
}
