package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CheckInResponse {
    private Long recordId;
    private EventAttendeeResponse attendee;
    private LocalDateTime checkedInAt;
    private String message;
}
