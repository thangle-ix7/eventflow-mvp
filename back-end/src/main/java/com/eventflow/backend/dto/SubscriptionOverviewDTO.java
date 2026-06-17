package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class SubscriptionOverviewDTO {
    private SubscriptionPlanDTO plan;
    private String status;
    private LocalDateTime currentPeriodStart;
    private LocalDateTime currentPeriodEnd;
    private Long activeEventsUsed;
    private Long maxMembersUsedInLedEvents;
    private Long maxStorageBytesUsedInLedEvents;
    private Integer aiCreditsUsed;
    private Integer aiCreditsRemaining;
    private Boolean overLimit;
    private List<String> limitWarnings;
    private String source;
}
