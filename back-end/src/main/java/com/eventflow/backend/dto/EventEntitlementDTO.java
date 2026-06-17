package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class EventEntitlementDTO {
    private SubscriptionPlanDTO plan;
    private String source;
    private LocalDateTime expiresAt;
    private Long membersUsed;
    private Long storageBytesUsed;
    private Integer aiCreditsUsed;
    private Integer aiCreditsRemaining;
}
