package com.plzjob.backend.dto.request;

import com.plzjob.backend.entity.ApplicationStage;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;

@Getter
@NoArgsConstructor
public class JobPostingCreateRequest {
    @NotBlank private String companyName;
    @NotBlank private String title;
    private String url;
    private String position;
    private String region;
    private LocalDate startDate;
    private LocalDate deadline;
    private List<String> techStacks;
    private String description;
    private ApplicationStage initialStage;
    private LocalDate appliedAt;   // 지원일(APPLICATIONS.applied_at). 등록 폼의 '시작일' 입력을 대체.
    private boolean confirmDuplicate;
}
