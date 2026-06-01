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
public class EventReportItemDTO {
    private Long id;
    private Long taskId;
    private String taskTitle;
    private String taskStatus;
    private String departmentName;
    private String reporterName;
    private Integer progressPercentage;
    private String description;
    private Boolean hasImage;
    private String imageUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
