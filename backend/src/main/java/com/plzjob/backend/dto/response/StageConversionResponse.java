package com.plzjob.backend.dto.response;

import java.util.List;

public record StageConversionResponse(List<Stage> stages) {
    public record Stage(String stage, long count, Long passed, Double passRate) {}
}
