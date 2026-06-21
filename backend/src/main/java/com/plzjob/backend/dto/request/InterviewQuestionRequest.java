package com.plzjob.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class InterviewQuestionRequest {
    @NotNull private Long documentVersionId;
    private boolean regenerate;
}
