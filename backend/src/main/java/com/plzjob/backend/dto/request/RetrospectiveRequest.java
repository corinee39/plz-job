package com.plzjob.backend.dto.request;

import com.plzjob.backend.entity.Difficulty;
import com.plzjob.backend.entity.RetrospectiveType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class RetrospectiveRequest {
    @NotNull private RetrospectiveType type;
    private Difficulty difficulty;
    @NotBlank private String content;
    private String improvement;
}
