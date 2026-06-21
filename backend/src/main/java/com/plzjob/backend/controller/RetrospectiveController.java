package com.plzjob.backend.controller;

import com.plzjob.backend.auth.LoginUserId;
import com.plzjob.backend.common.ApiResponse;
import com.plzjob.backend.dto.request.RetrospectiveRequest;
import com.plzjob.backend.dto.response.RetrospectiveResponse;
import com.plzjob.backend.service.RetrospectiveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RetrospectiveController {

    private final RetrospectiveService retrospectiveService;

    @PostMapping("/applications/{applicationId}/retrospectives")
    public ResponseEntity<ApiResponse<RetrospectiveResponse>> create(
            @LoginUserId Long userId,
            @PathVariable Long applicationId,
            @RequestBody @Valid RetrospectiveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(retrospectiveService.create(userId, applicationId, request)));
    }

    @GetMapping("/applications/{applicationId}/retrospectives")
    public ResponseEntity<ApiResponse<List<RetrospectiveResponse>>> list(
            @LoginUserId Long userId,
            @PathVariable Long applicationId) {
        return ResponseEntity.ok(ApiResponse.ok(retrospectiveService.list(userId, applicationId)));
    }

    @PutMapping("/retrospectives/{retrospectiveId}")
    public ResponseEntity<ApiResponse<RetrospectiveResponse>> update(
            @LoginUserId Long userId,
            @PathVariable Long retrospectiveId,
            @RequestBody @Valid RetrospectiveRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(retrospectiveService.update(userId, retrospectiveId, request)));
    }

    @DeleteMapping("/retrospectives/{retrospectiveId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @LoginUserId Long userId,
            @PathVariable Long retrospectiveId) {
        retrospectiveService.delete(userId, retrospectiveId);
        return ResponseEntity.noContent().build();
    }
}
