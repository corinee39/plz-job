package com.plzjob.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ANALYTICS_STACK_TRENDS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AnalyticsStackTrend {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ast_seq")
    @SequenceGenerator(name = "ast_seq", sequenceName = "SEQ_ANALYTICS_STACK", allocationSize = 50)
    private Long id;

    @Column(name = "base_month", nullable = false, length = 7)
    private String baseMonth;

    // 'ALL' = 직무 무관 전체. Oracle UNIQUE 제약이 NULL을 다르게 취급하므로 null 대신 'ALL' 센티넬 사용
    @Column(nullable = false, length = 50)
    private String position;

    @Column(name = "stack_name", nullable = false, length = 50)
    private String stackName;

    @Column(name = "posting_count", nullable = false)
    private long postingCount;

    @Column(nullable = false)
    private double ratio;

    @Builder
    public AnalyticsStackTrend(String baseMonth, String position, String stackName,
                                long postingCount, double ratio) {
        this.baseMonth = baseMonth;
        this.position = position;
        this.stackName = stackName;
        this.postingCount = postingCount;
        this.ratio = ratio;
    }
}
