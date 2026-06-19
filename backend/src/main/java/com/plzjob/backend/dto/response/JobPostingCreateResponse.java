package com.plzjob.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class JobPostingCreateResponse {
    private Long jobPostingId;
    private Long applicationId;
    private String companyName;
    private String title;
    private String currentStage;
}
