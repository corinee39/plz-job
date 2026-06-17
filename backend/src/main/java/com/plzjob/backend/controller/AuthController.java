package com.plzjob.backend.controller;

import com.plzjob.backend.common.ApiResponse;
import com.plzjob.backend.dto.response.LoginResponse;
import com.plzjob.backend.entity.AuthProvider;
import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import com.plzjob.backend.service.AuthService;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @GetMapping("/oauth2/{provider}")
    public ResponseEntity<ApiResponse<Map<String, String>>> authUrl(
            @PathVariable String provider,
            @RequestParam(required = false) String redirectUri) {
        AuthProvider p = parseProvider(provider);
        String url = authService.getAuthorizationUrl(p, redirectUri);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("provider", provider, "authorizationUrl", url)));
    }

    @GetMapping("/oauth2/{provider}/callback")
    public ResponseEntity<ApiResponse<LoginResponse>> callback(
            @PathVariable String provider,
            @RequestParam String code,
            HttpServletResponse res) {
        AuthProvider p = parseProvider(provider);
        var r = authService.socialLogin(p, code);
        setAuthCookies(res, r.accessToken(), r.refreshToken());
        var body = LoginResponse.builder()
                .user(LoginResponse.UserSummary.builder()
                        .userId(r.userId()).nickname(r.nickname()).provider(r.provider()).build())
                .isNewUser(r.isNewUser()).build();
        return ResponseEntity.ok(ApiResponse.ok(body));
    }

    @PostMapping("/reissue")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> reissue(
            HttpServletRequest req, HttpServletResponse res) {
        String refresh = readCookie(req, "refresh_token");
        var tokens = authService.reissue(refresh);
        setAuthCookies(res, tokens.accessToken(), tokens.refreshToken());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("reissued", true)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletResponse res) {
        addCookie(res, "access_token", "", 0);
        addCookie(res, "refresh_token", "", 0);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    private AuthProvider parseProvider(String provider) {
        try { return AuthProvider.valueOf(provider.toUpperCase()); }
        catch (IllegalArgumentException e) { throw new CustomException(ErrorCode.INVALID_PROVIDER); }
    }

    private void setAuthCookies(HttpServletResponse res, String access, String refresh) {
        addCookie(res, "access_token", access, 1800);
        addCookie(res, "refresh_token", refresh, 1209600);
    }

    private void addCookie(HttpServletResponse res, String name, String value, long maxAge) {
        ResponseCookie c = ResponseCookie.from(name, value)
                .httpOnly(true).secure(false).path("/").sameSite("Lax").maxAge(maxAge).build();
        res.addHeader(HttpHeaders.SET_COOKIE, c.toString());
    }

    private String readCookie(HttpServletRequest req, String name) {
        if (req.getCookies() == null) return null;
        return Arrays.stream(req.getCookies())
                .filter(c -> name.equals(c.getName()))
                .map(Cookie::getValue).findFirst().orElse(null);
    }
}
