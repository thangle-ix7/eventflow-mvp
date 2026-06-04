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
public class TaskAttachmentResponseDTO {
    private Long id;
    private Long taskId;
    private Long uploaderId;
    private String uploaderName;
    private String originalName;
    private String contentType;
    private Long sizeBytes;
    private String downloadUrl;
    private String externalUrl;
    private String attachmentType;
    private String visibility;
    private Boolean canEdit;
    private Boolean canDelete;
    private LocalDateTime createdAt;
}
