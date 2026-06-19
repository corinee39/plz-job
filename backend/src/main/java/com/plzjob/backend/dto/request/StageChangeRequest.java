package com.plzjob.backend.dto.request;

import com.plzjob.backend.entity.ApplicationStage;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class StageChangeRequest {
    @NotNull private ApplicationStage toStage;
    private String memo;
}
