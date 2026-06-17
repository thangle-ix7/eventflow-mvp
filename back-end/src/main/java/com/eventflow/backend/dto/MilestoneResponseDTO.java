package com.eventflow.backend.dto;

import com.eventflow.backend.entity.MilestoneStatus;
import com.eventflow.backend.entity.TaskPriority;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MilestoneResponseDTO {
    private Long id;
    private Long eventId;
    private String name;
    private String description;
    private LocalDateTime expectedDeadline;
    private String expectedResult;
    private TaskPriority priority;
    private MilestoneStatus status;
    private Long totalTasks;
    private Long completedTasks;
    private Integer progressPercentage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
