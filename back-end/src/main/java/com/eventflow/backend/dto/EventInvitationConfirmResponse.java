package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventInvitationConfirmResponse {
    private String message;
    private Long eventId;
    private String eventName;
}
