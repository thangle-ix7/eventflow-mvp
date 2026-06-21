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
    private Long parentId;
    private Long departmentId;
    private String departmentName;
    private Long milestoneId;
    private String milestoneName;
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private LocalDateTime deadline;
    private Integer reminderOffsetMinutes;
    private String deadlineStatus;
    private Long minutesUntilDeadline;
    private Integer progressPercentage;
    private Long assigneeId;
    private String assigneeName;
}

