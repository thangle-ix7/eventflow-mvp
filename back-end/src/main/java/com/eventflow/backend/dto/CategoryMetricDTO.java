package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryMetricDTO {
    private String label;
    private Long totalTasks;
    private Long completedTasks;
    private Long overdueTasksCount;
}
