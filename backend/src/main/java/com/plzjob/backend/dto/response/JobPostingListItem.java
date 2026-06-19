package com.plzjob.backend.dto.response;

import com.plzjob.backend.entity.Application;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDate;

@Getter
@Builder
public class JobPostingListItem {
    private Long jobPostingId;
    private Long applicationId;
    private String companyName;
    private String title;
    private String position;
    private String region;
    private LocalDate deadline;
    private String currentStage;
    private String finalResult;
    private boolean favorite;

    public static JobPostingListItem from(Application a) {
        var p = a.getJobPosting();
        return JobPostingListItem.builder()
                .jobPostingId(p.getId()).applicationId(a.getId())
                .companyName(p.getCompanyName()).title(p.getTitle())
                .position(p.getPosition()).region(p.getRegion())
                .deadline(p.getDeadline()).currentStage(a.getCurrentStage().name())
                .finalResult(a.getFinalResult().name()).favorite(p.isFavorite())
                .build();
    }
}
