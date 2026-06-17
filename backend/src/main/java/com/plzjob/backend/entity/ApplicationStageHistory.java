package com.plzjob.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "APPLICATION_STAGE_HISTORIES")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApplicationStageHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "stage_history_seq")
    @SequenceGenerator(name = "stage_history_seq", sequenceName = "SEQ_STAGE_HISTORIES", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_stage", length = 20)
    private ApplicationStage fromStage;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_stage", nullable = false, length = 20)
    private ApplicationStage toStage;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private LocalDateTime changedAt;

    @Column(length = 500)
    private String memo;

    @Builder
    public ApplicationStageHistory(Application application, ApplicationStage fromStage,
                                   ApplicationStage toStage, String memo) {
        this.application = application;
        this.fromStage = fromStage;
        this.toStage = toStage;
        this.memo = memo;
        this.changedAt = LocalDateTime.now();
    }
}
