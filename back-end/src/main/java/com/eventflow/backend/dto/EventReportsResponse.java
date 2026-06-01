package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventReportsResponse {
    private LocalDate fromDate;
    private LocalDate toDate;
    private EventReportSummaryDTO summary;
    private List<EventReportItemDTO> reports;
}
