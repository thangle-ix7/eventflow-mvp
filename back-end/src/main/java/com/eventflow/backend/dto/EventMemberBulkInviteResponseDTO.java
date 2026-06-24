package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class EventMemberBulkInviteResponseDTO {
    private int total;
    private int sentCount;
    private int failedCount;
    private List<EventMemberBulkInviteItemDTO> results;
}
