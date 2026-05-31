package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentDashboardSummaryDTO {
    private Long departmentId;
    private String departmentName;
    private Long totalTasks;
    private Long completedTasks;
    private Integer progressPercentage;
    private Long overdueTasksCount;
    private List<CategoryMetricDTO> assigneeSummaries;
}
