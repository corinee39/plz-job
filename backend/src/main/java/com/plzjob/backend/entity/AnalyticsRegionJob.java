package com.plzjob.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ANALYTICS_REGION_JOBS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AnalyticsRegionJob {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "arj_seq")
    @SequenceGenerator(name = "arj_seq", sequenceName = "SEQ_ANALYTICS_REGION", allocationSize = 50)
    private Long id;

    @Column(name = "base_month", nullable = false, length = 7)
    private String baseMonth;

    @Column(nullable = false, length = 50)
    private String region;

    // 시·도 합계 행은 sigungu='ALL', 구 단위 드릴다운은 실제 구 이름. 조회 시 반드시 sigungu='ALL' 필터 필요.
    @Column(nullable = false, length = 50)
    private String sigungu;

    @Column(name = "posting_count", nullable = false)
    private long postingCount;

    @Builder
    public AnalyticsRegionJob(String baseMonth, String region, String sigungu, long postingCount) {
        this.baseMonth = baseMonth;
        this.region = region;
        this.sigungu = sigungu;
        this.postingCount = postingCount;
    }
}
