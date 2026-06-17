package com.eventflow.backend.dto;

import com.eventflow.backend.entity.FeedbackStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FeedbackResponseDTO {
    private Long id;
    private Long eventId;
    private String eventName;
    private String category;
    private String message;
    private Boolean anonymous;
    private Boolean publicVisible;
    private String contactEmail;
    private Long userId;
    private String userName;
    private FeedbackStatus status;
    private String responseMessage;
    private String respondedByName;
    private LocalDateTime respondedAt;
    private LocalDateTime createdAt;
}
