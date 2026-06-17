package com.plzjob.backend.client;

import com.plzjob.backend.entity.AuthProvider;
import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.*;
import org.springframework.web.client.RestClient;
import java.util.Map;

@Component
public class OAuthClient {

    private final RestClient rest = RestClient.create();

    @Value("${oauth.kakao.client-id}")      private String kakaoClientId;
    @Value("${oauth.kakao.redirect-uri}")   private String kakaoRedirectUri;
    @Value("${oauth.google.client-id}")     private String googleClientId;
    @Value("${oauth.google.client-secret}") private String googleClientSecret;
    @Value("${oauth.google.redirect-uri}")  private String googleRedirectUri;

    public String buildAuthorizationUrl(AuthProvider provider, String redirectUri) {
        return switch (provider) {
            case KAKAO -> "https://kauth.kakao.com/oauth/authorize?response_type=code"
                    + "&client_id=" + kakaoClientId
                    + "&redirect_uri=" + (redirectUri != null ? redirectUri : kakaoRedirectUri);
            case GOOGLE -> "https://accounts.google.com/o/oauth2/v2/auth?response_type=code"
                    + "&client_id=" + googleClientId
                    + "&redirect_uri=" + (redirectUri != null ? redirectUri : googleRedirectUri)
                    + "&scope=openid%20email%20profile";
        };
    }

    public OAuthUserInfo fetchUserInfo(AuthProvider provider, String code) {
        return switch (provider) {
            case KAKAO  -> fetchKakao(code);
            case GOOGLE -> fetchGoogle(code);
        };
    }

    @SuppressWarnings("unchecked")
    private OAuthUserInfo fetchKakao(String code) {
        try {
            MultiValueMap<String, String> p = new LinkedMultiValueMap<>();
            p.add("grant_type", "authorization_code");
            p.add("client_id", kakaoClientId);
            p.add("redirect_uri", kakaoRedirectUri);
            p.add("code", code);
            Map<String, Object> token = rest.post().uri("https://kauth.kakao.com/oauth/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(p).retrieve().body(Map.class);
            Map<String, Object> me = rest.get().uri("https://kapi.kakao.com/v2/user/me")
                    .header("Authorization", "Bearer " + token.get("access_token")).retrieve().body(Map.class);
            String id = String.valueOf(me.get("id"));
            Map<String, Object> account = (Map<String, Object>) me.get("kakao_account");
            String email = account != null ? (String) account.get("email") : null;
            String nickname = "카카오사용자";
            if (account != null) {
                Map<String, Object> profile = (Map<String, Object>) account.get("profile");
                if (profile != null && profile.get("nickname") != null) nickname = (String) profile.get("nickname");
            }
            return new OAuthUserInfo(AuthProvider.KAKAO, id, nickname, email);
        } catch (Exception e) { throw new CustomException(ErrorCode.OAUTH_AUTH_FAILED); }
    }

    @SuppressWarnings("unchecked")
    private OAuthUserInfo fetchGoogle(String code) {
        try {
            MultiValueMap<String, String> p = new LinkedMultiValueMap<>();
            p.add("grant_type", "authorization_code");
            p.add("client_id", googleClientId);
            p.add("client_secret", googleClientSecret);
            p.add("redirect_uri", googleRedirectUri);
            p.add("code", code);
            Map<String, Object> token = rest.post().uri("https://oauth2.googleapis.com/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(p).retrieve().body(Map.class);
            Map<String, Object> me = rest.get().uri("https://www.googleapis.com/oauth2/v2/userinfo")
                    .header("Authorization", "Bearer " + token.get("access_token")).retrieve().body(Map.class);
            return new OAuthUserInfo(AuthProvider.GOOGLE, String.valueOf(me.get("id")),
                    me.get("name") != null ? (String) me.get("name") : "구글사용자", (String) me.get("email"));
        } catch (Exception e) { throw new CustomException(ErrorCode.OAUTH_AUTH_FAILED); }
    }

    public record OAuthUserInfo(AuthProvider provider, String providerUserId, String nickname, String email) {}
}
