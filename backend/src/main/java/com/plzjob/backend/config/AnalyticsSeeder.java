package com.plzjob.backend.config;

import com.plzjob.backend.entity.*;
import com.plzjob.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.time.YearMonth;
import java.util.List;

@Component
@RequiredArgsConstructor
public class AnalyticsSeeder implements CommandLineRunner {

    private final AnalyticsStackTrendRepository stackRepo;
    private final AnalyticsRegionJobRepository regionRepo;

    @Override
    public void run(String... args) {
        if (stackRepo.count() > 0) return;
        String m = YearMonth.now().toString();
        stackRepo.saveAll(List.of(
                AnalyticsStackTrend.builder().baseMonth(m).position("ALL").stackName("Java").postingCount(1240).ratio(22.0).build(),
                AnalyticsStackTrend.builder().baseMonth(m).position("ALL").stackName("Spring").postingCount(1100).ratio(19.5).build(),
                AnalyticsStackTrend.builder().baseMonth(m).position("ALL").stackName("React").postingCount(980).ratio(17.4).build(),
                AnalyticsStackTrend.builder().baseMonth(m).position("ALL").stackName("Kubernetes").postingCount(870).ratio(15.4).build()
        ));
        // sigungu='ALL' → 시·도 합계 행 (구 단위 드릴다운 없이 시·도 집계만 조회 가능)
        regionRepo.saveAll(List.of(
                AnalyticsRegionJob.builder().baseMonth(m).region("서울").sigungu("ALL").postingCount(5200).build(),
                AnalyticsRegionJob.builder().baseMonth(m).region("경기").sigungu("ALL").postingCount(2100).build(),
                AnalyticsRegionJob.builder().baseMonth(m).region("부산").sigungu("ALL").postingCount(640).build()
        ));
    }
}
