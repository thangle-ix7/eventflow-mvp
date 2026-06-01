package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventReportSummaryDTO {
    private Long totalReports;
    private Long reportsWithImages;
    private Long reportedTasks;
    private Double averageReportedProgress;
}
