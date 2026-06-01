package com.eventflow.backend.dto;

import com.eventflow.backend.entity.TaskStatus;
import com.eventflow.backend.entity.TaskPriority;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponseDTO {
    private Long id;
    private Long eventId;
    private Long departmentId;
    private String departmentName;
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private LocalDateTime deadline;
    private Integer progressPercentage;
    private Long assigneeId;
    private String assigneeName;
}
