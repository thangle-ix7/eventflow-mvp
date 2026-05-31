package com.eventflow.backend.dto;

import com.eventflow.backend.entity.TaskStatus;
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
    private TaskStatus status;
    private LocalDateTime deadline;
    private Long assigneeId;
    private String assigneeName;
}
