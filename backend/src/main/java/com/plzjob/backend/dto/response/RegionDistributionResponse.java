package com.plzjob.backend.dto.response;

import java.util.List;

public record RegionDistributionResponse(String dataBaseDate, List<Item> regions) {
    public record Item(String region, long postingCount) {}
}
