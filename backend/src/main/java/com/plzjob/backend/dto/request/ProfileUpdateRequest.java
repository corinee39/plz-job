package com.plzjob.backend.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import java.util.List;

@Getter
@NoArgsConstructor
public class ProfileUpdateRequest {
    private String nickname;
    private String desiredPosition;
    private String desiredRegion;
    private List<String> techStacks;
}
