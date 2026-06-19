package com.plzjob.backend.controller;

import com.plzjob.backend.auth.LoginUserId;
import com.plzjob.backend.client.JobPostingPreviewClient;
import com.plzjob.backend.common.ApiResponse;
import com.plzjob.backend.common.PageResponse;
import com.plzjob.backend.dto.request.JobPostingCreateRequest;
import com.plzjob.backend.dto.request.JobPostingUpdateRequest;
import com.plzjob.backend.dto.request.PreviewRequest;
import com.plzjob.backend.dto.response.JobPostingCreateResponse;
import com.plzjob.backend.dto.response.JobPostingDetailResponse;
import com.plzjob.backend.dto.response.JobPostingListItem;
import com.plzjob.backend.entity.ApplicationStage;
import com.plzjob.backend.service.JobPostingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/job-postings")
@RequiredArgsConstructor
public class JobPostingController {

    private final JobPostingService jobPostingService;

    @PostMapping("/preview")
    public ResponseEntity<ApiResponse<JobPostingPreviewClient.PreviewResult>> preview(
            @LoginUserId Long userId, @RequestBody @Valid PreviewRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(jobPostingService.preview(request.getUrl())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<JobPostingCreateResponse>> create(
            @LoginUserId Long userId, @RequestBody @Valid JobPostingCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(jobPostingService.create(userId, request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<JobPostingListItem>>> list(
            @LoginUserId Long userId,
            @RequestParam(required = false) ApplicationStage stage,
            @PageableDefault(size = 20) Pageable pageable) {
        var page = jobPostingService.list(userId, stage, pageable);
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.of(page, x -> x)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JobPostingDetailResponse>> get(
            @LoginUserId Long userId, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(jobPostingService.getDetail(userId, id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<JobPostingDetailResponse>> update(
            @LoginUserId Long userId, @PathVariable Long id,
            @RequestBody JobPostingUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(jobPostingService.update(userId, id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @LoginUserId Long userId, @PathVariable Long id) {
        jobPostingService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
