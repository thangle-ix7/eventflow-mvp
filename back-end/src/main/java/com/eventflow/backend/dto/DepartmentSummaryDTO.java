package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentSummaryDTO {
    private String departmentName;
    private Long totalTasks;
    private Long overdueTasksCount;
}
