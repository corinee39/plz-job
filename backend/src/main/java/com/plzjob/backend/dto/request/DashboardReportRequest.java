package com.plzjob.backend.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class DashboardReportRequest {
    private LocalDate from;
    private LocalDate to;
    private String position;
    private String region;
}
