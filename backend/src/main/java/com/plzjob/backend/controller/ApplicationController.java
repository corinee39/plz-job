package com.plzjob.backend.controller;

import com.plzjob.backend.auth.LoginUserId;
import com.plzjob.backend.common.ApiResponse;
import com.plzjob.backend.dto.request.StageChangeRequest;
import com.plzjob.backend.dto.response.StageHistoryItem;
import com.plzjob.backend.service.ApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    @PutMapping("/{applicationId}/stage")
    public ResponseEntity<ApiResponse<StageHistoryItem>> changeStage(
            @LoginUserId Long userId, @PathVariable Long applicationId,
            @RequestBody @Valid StageChangeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(applicationService.changeStage(userId, applicationId, request)));
    }

    @GetMapping("/{applicationId}/stage-histories")
    public ResponseEntity<ApiResponse<List<StageHistoryItem>>> histories(
            @LoginUserId Long userId, @PathVariable Long applicationId) {
        return ResponseEntity.ok(ApiResponse.ok(applicationService.getStageHistories(userId, applicationId)));
    }
}
