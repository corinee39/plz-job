package com.plzjob.backend.dto.response;

import java.util.List;

public record StackTrendResponse(String dataBaseDate, List<Item> trends) {
    public record Item(String stack, long postingCount, double ratio) {}
}
