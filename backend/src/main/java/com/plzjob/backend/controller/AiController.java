package com.plzjob.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.plzjob.backend.auth.LoginUserId;
import com.plzjob.backend.common.ApiResponse;
import com.plzjob.backend.dto.request.DashboardReportRequest;
import com.plzjob.backend.dto.request.InterviewQuestionRequest;
import com.plzjob.backend.entity.AiGenerationType;
import com.plzjob.backend.service.AiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/applications/{applicationId}/interview-questions")
    public ResponseEntity<ApiResponse<JsonNode>> interviewQuestions(
            @LoginUserId Long userId,
            @PathVariable Long applicationId,
            @RequestBody @Valid InterviewQuestionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(aiService.interviewQuestions(userId, applicationId, request)));
    }

    @PostMapping("/dashboard-report")
    public ResponseEntity<ApiResponse<JsonNode>> dashboardReport(
            @LoginUserId Long userId,
            @RequestBody DashboardReportRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(aiService.dashboardReport(userId, request)));
    }

    @GetMapping("/generations")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> generations(
            @LoginUserId Long userId,
            @RequestParam Long applicationId,
            @RequestParam AiGenerationType type) {
        var list = aiService.generations(userId, applicationId, type).stream()
                .map(g -> Map.<String, Object>of(
                        "generationId", g.getId(),
                        "type", g.getGenerationType().name(),
                        "applicationId", applicationId,
                        "createdAt", g.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health(@LoginUserId Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(aiService.health()));
    }
}
