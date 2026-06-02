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
public class EventDocumentDTO {
    private Long id;
    private Long taskId;
    private String taskTitle;
    private Long parentTaskId;
    private String parentTaskTitle;
    private Boolean subtask;
    private Long departmentId;
    private String departmentName;
    private String uploaderName;
    private String originalName;
    private String contentType;
    private Long sizeBytes;
    private String downloadUrl;
    private LocalDateTime createdAt;
}
