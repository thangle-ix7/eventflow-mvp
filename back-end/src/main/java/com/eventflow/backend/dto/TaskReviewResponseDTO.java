package com.eventflow.backend.dto;

import com.eventflow.backend.entity.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskReviewResponseDTO {
    private Long id;
    private Long taskId;
    private Long reviewerId;
    private String reviewerName;
    private TaskStatus statusBefore;
    private TaskStatus statusAfter;
    private String feedback;
    private LocalDateTime reviewedAt;
}
