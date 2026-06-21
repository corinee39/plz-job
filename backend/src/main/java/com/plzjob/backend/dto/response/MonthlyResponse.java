package com.plzjob.backend.dto.response;

import java.util.List;

public record MonthlyResponse(List<Item> monthly) {
    public record Item(String month, long applied) {}
}
