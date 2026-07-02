package com.eventflow.backend.dto;

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
    private Long totalTasks;
    private Long completedTasks;
    private Integer progressPercentage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
