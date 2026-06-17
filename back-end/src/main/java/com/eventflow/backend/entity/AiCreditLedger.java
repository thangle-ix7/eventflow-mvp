package com.eventflow.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_credit_ledger")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiCreditLedger {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_pass_id")
    private EventPass eventPass;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 30)
    private AiCreditSourceType sourceType;

    @Column(name = "plan_code", nullable = false, length = 40)
    private String planCode;

    @Column(name = "credits_delta", nullable = false)
    private Integer creditsDelta;

    @Column(nullable = false, length = 80)
    private String action;

    @Column(length = 255)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
