package com.eventflow.backend.dto;

import com.eventflow.backend.entity.AttendeeStatus;
import com.eventflow.backend.entity.AttendeeType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class EventAttendeeResponse {
    private Long id;
    private Long eventId;
    private Long sessionId;
    private String sessionName;
    private String fullName;
    private String email;
    private String phone;
    private AttendeeType attendeeType;
    private AttendeeStatus status;
    private String qrToken;
    private String inviteCode;
    private String checkInUrl;
    private String note;
    private LocalDateTime checkedInAt;
    private LocalDateTime createdAt;
}

