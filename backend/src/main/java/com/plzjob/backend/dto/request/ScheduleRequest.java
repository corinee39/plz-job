package com.plzjob.backend.dto.request;

import com.plzjob.backend.entity.ScheduleType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class ScheduleRequest {
    @NotNull private ScheduleType scheduleType;
    @NotNull private LocalDateTime startAt;
    private String memo;
}
