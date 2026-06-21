package com.plzjob.backend.controller;

import com.plzjob.backend.auth.LoginUserId;
import com.plzjob.backend.common.ApiResponse;
import com.plzjob.backend.dto.request.ScheduleRequest;
import com.plzjob.backend.dto.response.ScheduleResponse;
import com.plzjob.backend.service.ScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    @PostMapping("/applications/{applicationId}/schedules")
    public ResponseEntity<ApiResponse<ScheduleResponse>> create(
            @LoginUserId Long userId,
            @PathVariable Long applicationId,
            @RequestBody @Valid ScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(scheduleService.create(userId, applicationId, request)));
    }

    @GetMapping("/schedules")
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> list(
            @LoginUserId Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long applicationId) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.list(userId, from, to, applicationId)));
    }

    @PutMapping("/schedules/{scheduleId}")
    public ResponseEntity<ApiResponse<ScheduleResponse>> update(
            @LoginUserId Long userId,
            @PathVariable Long scheduleId,
            @RequestBody @Valid ScheduleRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.update(userId, scheduleId, request)));
    }

    @DeleteMapping("/schedules/{scheduleId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @LoginUserId Long userId,
            @PathVariable Long scheduleId) {
        scheduleService.delete(userId, scheduleId);
        return ResponseEntity.noContent().build();
    }
}
