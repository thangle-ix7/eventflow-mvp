package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SubscriptionPlanDTO {
    private String code;
    private String displayName;
    private String planType;
    private String billingInterval;
    private Long priceVnd;
    private String targetSegment;
    private Integer maxActiveEvents;
    private Boolean unlimitedEvents;
    private Integer maxUsersPerEvent;
    private Boolean unlimitedUsers;
    private Long storageLimitBytes;
    private Boolean unlimitedStorage;
    private Integer aiCreditsPerMonth;
    private Integer aiCreditsPerEvent;
    private Boolean unlimitedAi;
    private Integer eventDurationDays;
    private Long extraUserPriceVnd;
    private Integer priorityRank;
    private List<String> features;
}
