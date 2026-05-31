package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskReportResponseDTO {
    private Long id;
    private Long taskId;
    private Long reporterId;
    private String reporterName;
    private Integer progressPercentage;
    private String description;
    private String imageOriginalName;
    private String imageContentType;
    private Boolean hasImage;
    private String imageUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
