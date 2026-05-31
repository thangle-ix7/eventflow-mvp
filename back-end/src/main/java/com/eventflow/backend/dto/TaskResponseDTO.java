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
    private String title;
    private TaskStatus status;
    private LocalDateTime deadline;
    private String assigneeName;
}
