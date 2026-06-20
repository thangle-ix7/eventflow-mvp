package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EventMemberBulkInviteItemDTO {
    private String email;
    private String status;
    private String message;
    private EventInvitationResponseDTO invitation;
}
