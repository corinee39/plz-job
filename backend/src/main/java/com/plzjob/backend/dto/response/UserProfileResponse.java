package com.plzjob.backend.dto.response;

import com.plzjob.backend.entity.User;
import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class UserProfileResponse {
    private Long userId;
    private String nickname;
    private String email;
    private String provider;
    private String desiredPosition;
    private String desiredRegion;
    private List<String> techStacks;

    public static UserProfileResponse from(User u) {
        return UserProfileResponse.builder()
                .userId(u.getId()).nickname(u.getNickname()).email(u.getEmail())
                .provider(u.getProvider().name())
                .desiredPosition(u.getDesiredPosition()).desiredRegion(u.getDesiredRegion())
                .techStacks(u.getTechStacks())
                .build();
    }
}
