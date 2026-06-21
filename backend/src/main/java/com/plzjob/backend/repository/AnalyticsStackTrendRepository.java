package com.plzjob.backend.repository;

import com.plzjob.backend.entity.AnalyticsStackTrend;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AnalyticsStackTrendRepository extends JpaRepository<AnalyticsStackTrend, Long> {
    Optional<AnalyticsStackTrend> findFirstByOrderByBaseMonthDesc();
    List<AnalyticsStackTrend> findByBaseMonth(String baseMonth);
}
