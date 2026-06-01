package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private String type;
    private String status;
    private String channel;
    private String title;
    private String message;
    private Long taskId;
    private String taskTitle;
    private Long eventId;
    private String eventName;
    private LocalDateTime deadline;
    private LocalDateTime createdAt;
    private LocalDateTime sentAt;
    private LocalDateTime readAt;
    private String errorLog;
}
