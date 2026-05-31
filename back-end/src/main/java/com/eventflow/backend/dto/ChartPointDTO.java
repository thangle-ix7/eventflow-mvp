package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChartPointDTO {
    private String label;
    private Long totalTasks;
    private Long todoTasks;
    private Long inProgressTasks;
    private Long inReviewTasks;
    private Long completedTasks;
}
