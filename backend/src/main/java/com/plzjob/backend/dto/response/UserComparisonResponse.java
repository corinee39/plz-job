package com.plzjob.backend.dto.response;

import java.util.List;

public record UserComparisonResponse(String dataBaseDate, List<Item> comparison) {
    public record Item(String stack, double userRatio, double marketRatio, double gap) {}
}
