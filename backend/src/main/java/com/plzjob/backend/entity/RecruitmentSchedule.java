package com.plzjob.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;
import java.time.LocalDateTime;

@Entity
@Table(name = "RECRUITMENT_SCHEDULES")
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecruitmentSchedule extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "schedule_seq")
    @SequenceGenerator(name = "schedule_seq", sequenceName = "SEQ_SCHEDULES", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_type", nullable = false, length = 20)
    private ScheduleType scheduleType;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(length = 500)
    private String memo;

    @Builder
    public RecruitmentSchedule(Application application, ScheduleType scheduleType,
                                LocalDateTime startAt, String memo) {
        this.application = application;
        this.scheduleType = scheduleType;
        this.startAt = startAt;
        this.memo = memo;
    }

    public void update(ScheduleType scheduleType, LocalDateTime startAt, String memo) {
        if (scheduleType != null) this.scheduleType = scheduleType;
        if (startAt != null) this.startAt = startAt;
        if (memo != null) this.memo = memo;
    }
}
