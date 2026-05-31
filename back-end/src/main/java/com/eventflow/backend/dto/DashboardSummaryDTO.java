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
public class DashboardSummaryDTO {
    private Long totalTasks;
    private Long completedTasks;
    private Integer progressPercentage;
    private Long overdueTasksCount;
    private Integer daysUntilEvent;
    private List<DepartmentSummaryDTO> departmentSummaries;
}
