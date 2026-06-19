package com.plzjob.backend.dto.response;

import com.plzjob.backend.entity.Application;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class JobPostingDetailResponse {
    private Long jobPostingId;
    private Long applicationId;
    private String companyName;
    private String title;
    private String url;
    private String position;
    private String region;
    private LocalDate startDate;
    private LocalDate deadline;
    private List<String> techStacks;
    private String description;
    private String currentStage;
    private String finalResult;
    private boolean favorite;

    public static JobPostingDetailResponse from(Application a) {
        var p = a.getJobPosting();
        return JobPostingDetailResponse.builder()
                .jobPostingId(p.getId()).applicationId(a.getId())
                .companyName(p.getCompanyName()).title(p.getTitle()).url(p.getUrl())
                .position(p.getPosition()).region(p.getRegion())
                .startDate(p.getStartDate()).deadline(p.getDeadline())
                .techStacks(p.getTechStacks()).description(p.getDescription())
                .currentStage(a.getCurrentStage().name()).finalResult(a.getFinalResult().name())
                .favorite(p.isFavorite())
                .build();
    }
}
