package com.plzjob.backend.common;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {
    private static final String DELIM = ",";

    @Override
    public String convertToDatabaseColumn(List<String> attr) {
        return (attr == null || attr.isEmpty()) ? "" : String.join(DELIM, attr);
    }

    @Override
    public List<String> convertToEntityAttribute(String db) {
        return (db == null || db.isBlank()) ? new ArrayList<>() : new ArrayList<>(Arrays.asList(db.split(DELIM)));
    }
}
