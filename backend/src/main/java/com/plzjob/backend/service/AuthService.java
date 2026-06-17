package com.plzjob.backend.service;

import com.plzjob.backend.auth.JwtProvider;
import com.plzjob.backend.client.OAuthClient;
import com.plzjob.backend.entity.AuthProvider;
import com.plzjob.backend.entity.User;
import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import com.plzjob.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final OAuthClient oAuthClient;
    private final JwtProvider jwtProvider;

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
        return new SocialLoginResult(
                jwtProvider.createAccessToken(user.getId()),
                jwtProvider.createRefreshToken(user.getId()),
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
