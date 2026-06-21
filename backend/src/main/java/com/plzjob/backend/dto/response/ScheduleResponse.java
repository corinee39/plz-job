package com.plzjob.backend.dto.response;

import com.plzjob.backend.entity.RecruitmentSchedule;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@Builder
public class ScheduleResponse {
    private Long scheduleId;
    private Long applicationId;
    private String companyName;
    private String scheduleType;
    private LocalDateTime startAt;
    private String memo;
    private String status; // PAST / UPCOMING

    public static ScheduleResponse from(RecruitmentSchedule s) {
        return ScheduleResponse.builder()
                .scheduleId(s.getId())
                .applicationId(s.getApplication().getId())
                .companyName(s.getApplication().getJobPosting().getCompanyName())
                .scheduleType(s.getScheduleType().name())
                .startAt(s.getStartAt())
                .memo(s.getMemo())
                .status(s.getStartAt().isBefore(LocalDateTime.now()) ? "PAST" : "UPCOMING")
                .build();
    }
}
