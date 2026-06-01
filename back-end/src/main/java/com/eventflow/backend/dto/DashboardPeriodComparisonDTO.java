package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardPeriodComparisonDTO {
    private LocalDate fromDate;
    private LocalDate toDate;
    private LocalDate previousFromDate;
    private LocalDate previousToDate;
    private MetricComparisonDTO totalTasks;
    private MetricComparisonDTO completedTasks;
    private MetricComparisonDTO overdueTasks;
    private Integer currentProgressPercentage;
    private Integer previousProgressPercentage;
    private Integer progressDeltaPoints;
}
