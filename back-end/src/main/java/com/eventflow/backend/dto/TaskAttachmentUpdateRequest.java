package com.eventflow.backend.dto;

import lombok.Data;

@Data
public class TaskAttachmentUpdateRequest {
    private String originalName;
    private String externalUrl;
    private String visibility;
}
