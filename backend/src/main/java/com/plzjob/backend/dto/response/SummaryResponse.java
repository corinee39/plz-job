package com.plzjob.backend.dto.response;

public record SummaryResponse(
        long thisMonthApplications,
        long inProgressCount,
        long upcomingSchedules,
        long finalPassCount,
        Double overallPassRate,
        long sampleSize,
        String dataBaseDate
) {}
