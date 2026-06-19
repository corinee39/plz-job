package com.plzjob.backend.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;

@Getter
@NoArgsConstructor
public class JobPostingUpdateRequest {
    private String companyName;
    private String title;
    private String position;
    private String region;
    private LocalDate startDate;
    private LocalDate deadline;
    private List<String> techStacks;
    private String description;
    private Boolean favorite;
}
