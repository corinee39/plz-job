package com.plzjob.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {
    private UserSummary user;
    private boolean isNewUser;

    @Getter
    @Builder
    public static class UserSummary {
        private Long userId;
        private String nickname;
        private String provider;
    }
}
