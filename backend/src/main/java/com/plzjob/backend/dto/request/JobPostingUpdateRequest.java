package com.plzjob.backend.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;

@Getter
@NoArgsConstructor
public class JobPostingUpdateRequest {
    private String companyName;
    private String title;
    private String position;
    private String region;
    private LocalDate appliedAt;   // 지원일(APPLICATIONS.applied_at). 기존 startDate 입력을 대체.
    private LocalDate deadline;
    private List<String> techStacks;
    private String description;
    private Boolean favorite;
}
