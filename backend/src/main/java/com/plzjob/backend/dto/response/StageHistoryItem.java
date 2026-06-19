package com.plzjob.backend.dto.response;

import com.plzjob.backend.entity.ApplicationStageHistory;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@Builder
public class StageHistoryItem {
    private Long historyId;
    private String fromStage;
    private String toStage;
    private LocalDateTime changedAt;
    private String memo;

    public static StageHistoryItem from(ApplicationStageHistory h) {
        return StageHistoryItem.builder()
                .historyId(h.getId())
                .fromStage(h.getFromStage() != null ? h.getFromStage().name() : null)
                .toStage(h.getToStage().name())
                .changedAt(h.getChangedAt())
                .memo(h.getMemo())
                .build();
    }
}
