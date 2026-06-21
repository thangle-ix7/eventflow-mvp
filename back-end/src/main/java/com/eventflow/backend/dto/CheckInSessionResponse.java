package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CheckInSessionResponse {
    private Long id;
    private Long eventId;
    private String name;
    private String location;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private Boolean active;
    private Long attendeeCount;
    private Long checkedInCount;
    private LocalDateTime createdAt;
}