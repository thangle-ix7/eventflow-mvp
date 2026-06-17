package com.eventflow.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "subscription_plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPlan {
    @Id
    @Column(length = 40)
    private String code;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type", nullable = false, length = 30)
    private PlanType planType;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_interval", length = 20)
    private BillingInterval billingInterval;

    @Column(name = "price_vnd", nullable = false)
    private Long priceVnd;

    @Column(name = "target_segment")
    private String targetSegment;

    @Column(name = "max_active_events")
    private Integer maxActiveEvents;

    @Column(name = "unlimited_events", nullable = false)
    private boolean unlimitedEvents;

    @Column(name = "max_users_per_event")
    private Integer maxUsersPerEvent;

    @Column(name = "unlimited_users", nullable = false)
    private boolean unlimitedUsers;

    @Column(name = "storage_limit_bytes")
    private Long storageLimitBytes;

    @Column(name = "unlimited_storage", nullable = false)
    private boolean unlimitedStorage;

    @Column(name = "ai_credits_per_month")
    private Integer aiCreditsPerMonth;

    @Column(name = "ai_credits_per_event")
    private Integer aiCreditsPerEvent;

    @Column(name = "unlimited_ai", nullable = false)
    private boolean unlimitedAi;

    @Column(name = "event_duration_days")
    private Integer eventDurationDays;

    @Column(name = "extra_user_price_vnd")
    private Long extraUserPriceVnd;

    @Column(name = "priority_rank", nullable = false)
    private Integer priorityRank;

    @Column(columnDefinition = "TEXT")
    private String features;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
