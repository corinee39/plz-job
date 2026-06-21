package com.plzjob.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "APPLICATIONS")
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Application extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "application_seq")
    @SequenceGenerator(name = "application_seq", sequenceName = "SEQ_APPLICATIONS", allocationSize = 50)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_posting_id", nullable = false, unique = true)
    private JobPosting jobPosting;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_stage", nullable = false, length = 20)
    private ApplicationStage currentStage;

    @Column(name = "applied_at")
    private LocalDateTime appliedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "final_result", nullable = false, length = 20)
    private FinalResult finalResult;

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ApplicationStageHistory> histories = new ArrayList<>();

    @Builder
    public Application(JobPosting jobPosting, User user, ApplicationStage initialStage,
                       LocalDateTime appliedAt) {
        this.jobPosting = jobPosting;
        this.user = user;
        this.currentStage = initialStage != null ? initialStage : ApplicationStage.INTERESTED;
        this.finalResult = FinalResult.IN_PROGRESS;
        if (appliedAt != null) {
            // 등록 폼에서 사용자가 입력한 지원일을 우선 사용
            this.appliedAt = appliedAt;
        } else if (this.currentStage.ordinal() >= ApplicationStage.APPLIED.ordinal()
                && this.currentStage != ApplicationStage.WITHDRAWN) {
            this.appliedAt = LocalDateTime.now();
        }
        this.histories.add(ApplicationStageHistory.builder()
                .application(this).fromStage(null).toStage(this.currentStage).build());
    }

    public ApplicationStageHistory changeStage(ApplicationStage to, String memo) {
        ApplicationStage from = this.currentStage;
        this.currentStage = to;
        if (to == ApplicationStage.APPLIED && this.appliedAt == null) this.appliedAt = LocalDateTime.now();
        switch (to) {
            case FINAL_PASS -> this.finalResult = FinalResult.FINAL_PASS;
            case DOCUMENT_FAIL, CODING_FAIL, INTERVIEW_FAIL -> this.finalResult = FinalResult.REJECTED;
            case WITHDRAWN -> this.finalResult = FinalResult.WITHDRAWN;
            default -> this.finalResult = FinalResult.IN_PROGRESS;
        }
        ApplicationStageHistory history = ApplicationStageHistory.builder()
                .application(this).fromStage(from).toStage(to).memo(memo).build();
        this.histories.add(history);
        return history;
    }

    /** 공고 수정 시 사용자가 입력한 지원일 갱신(null이면 기존 값 유지). */
    public void updateAppliedAt(LocalDateTime appliedAt) {
        if (appliedAt != null) this.appliedAt = appliedAt;
    }
}
