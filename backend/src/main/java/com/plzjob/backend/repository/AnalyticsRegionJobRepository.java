package com.plzjob.backend.repository;

import com.plzjob.backend.entity.AnalyticsRegionJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnalyticsRegionJobRepository extends JpaRepository<AnalyticsRegionJob, Long> {
    // sigungu='ALL' 조건 필수 — 구 단위 행까지 합산되면 중복 집계됨
    List<AnalyticsRegionJob> findByBaseMonthAndSigungu(String baseMonth, String sigungu);
}
