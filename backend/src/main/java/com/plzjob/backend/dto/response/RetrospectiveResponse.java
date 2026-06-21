package com.plzjob.backend.dto.response;

import com.plzjob.backend.entity.Retrospective;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RetrospectiveResponse {
    private Long retrospectiveId;
    private String type;
    private String difficulty;
    private String content;
    private String improvement;

    public static RetrospectiveResponse from(Retrospective r) {
        return RetrospectiveResponse.builder()
                .retrospectiveId(r.getId())
                .type(r.getType().name())
                .difficulty(r.getDifficulty() != null ? r.getDifficulty().name() : null)
                .content(r.getContent())
                .improvement(r.getImprovement())
                .build();
    }
}
