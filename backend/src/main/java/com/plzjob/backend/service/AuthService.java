package com.plzjob.backend.service;

import com.plzjob.backend.auth.JwtProvider;
import com.plzjob.backend.client.OAuthClient;
import com.plzjob.backend.entity.AuthProvider;
import com.plzjob.backend.entity.User;
import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import com.plzjob.backend.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final OAuthClient oAuthClient;
    private final JwtProvider jwtProvider;

    /** DEV 전용: 로그인 시 발급 JWT를 로그로 출력(운영에선 false). application.yaml의 jwt.log-token. */
    @Value("${jwt.log-token:false}")
    private boolean logToken;

    /** 부팅 시 토글 상태를 한 줄 찍어, .env가 실제로 로드됐는지(true/false) 바로 확인할 수 있게 한다. */
    @PostConstruct
    void logTokenFlagOnStartup() {
        log.info("[DEV] 로그인 JWT 로깅(jwt.log-token) = {}  (true여야 로그인 시 토큰이 찍힘)", logToken);
    }

    public String getAuthorizationUrl(AuthProvider provider, String redirectUri) {
        return oAuthClient.buildAuthorizationUrl(provider, redirectUri);
    }

    public SocialLoginResult socialLogin(AuthProvider provider, String code) {
        OAuthClient.OAuthUserInfo info = oAuthClient.fetchUserInfo(provider, code);
        boolean[] isNew = {false};
        User user = userRepository.findByProviderAndProviderUserId(provider, info.providerUserId())
                .orElseGet(() -> {
                    isNew[0] = true;
                    return userRepository.save(User.builder()
                            .provider(provider).providerUserId(info.providerUserId())
                            .nickname(info.nickname()).email(info.email()).build());
                });
        String accessToken = jwtProvider.createAccessToken(user.getId());
        String refreshToken = jwtProvider.createRefreshToken(user.getId());
        if (logToken) {   // DEV 전용 — Postman 등 테스트용. 운영에선 토큰을 로그에 남기지 않는다.
            log.warn("[DEV-ONLY] 로그인 JWT 발급 | userId={} provider={} | Authorization: Bearer {}",
                    user.getId(), provider.name(), accessToken);
        }
        return new SocialLoginResult(accessToken, refreshToken,
                user.getId(), user.getNickname(), provider.name(), isNew[0]);
    }

    public TokenPair reissue(String refreshToken) {
        if (refreshToken == null || !jwtProvider.isValid(refreshToken))
            throw new CustomException(ErrorCode.INVALID_REFRESH_TOKEN);
        Long userId = jwtProvider.getUserId(refreshToken);
        userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.INVALID_REFRESH_TOKEN));
        return new TokenPair(jwtProvider.createAccessToken(userId), jwtProvider.createRefreshToken(userId));
    }

    public record SocialLoginResult(String accessToken, String refreshToken,
                                    Long userId, String nickname, String provider, boolean isNewUser) {}
    public record TokenPair(String accessToken, String refreshToken) {}
}
