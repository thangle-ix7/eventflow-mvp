package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AttendeeImportResponse {
    private int importedCount;
    private int skippedCount;
    private List<String> errors;
}