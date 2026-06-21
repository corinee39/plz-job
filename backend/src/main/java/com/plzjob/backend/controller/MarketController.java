package com.plzjob.backend.controller;

import com.plzjob.backend.auth.LoginUserId;
import com.plzjob.backend.common.ApiResponse;
import com.plzjob.backend.dto.response.*;
import com.plzjob.backend.service.MarketService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketController {

    private final MarketService marketService;

    @GetMapping("/stack-trends")
    public ResponseEntity<ApiResponse<StackTrendResponse>> stackTrends(
            @LoginUserId Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String position,
            @RequestParam(required = false) String region) {
        return ResponseEntity.ok(ApiResponse.ok(marketService.stackTrends(from, to, position, region)));
    }

    @GetMapping("/region-distribution")
    public ResponseEntity<ApiResponse<RegionDistributionResponse>> regions(
            @LoginUserId Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String position) {
        return ResponseEntity.ok(ApiResponse.ok(marketService.regionDistribution(from, to, position)));
    }

    @GetMapping("/user-comparison")
    public ResponseEntity<ApiResponse<UserComparisonResponse>> comparison(
            @LoginUserId Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(marketService.userComparison(userId, from, to)));
    }
}
