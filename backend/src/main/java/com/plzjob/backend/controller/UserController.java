package com.plzjob.backend.controller;

import com.plzjob.backend.auth.LoginUserId;
import com.plzjob.backend.common.ApiResponse;
import com.plzjob.backend.dto.request.ProfileUpdateRequest;
import com.plzjob.backend.dto.response.UserProfileResponse;
import com.plzjob.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> me(@LoginUserId Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getMyProfile(userId)));
    }

    @PutMapping("/me/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> update(
            @LoginUserId Long userId,
            @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateProfile(userId, request)));
    }
}
