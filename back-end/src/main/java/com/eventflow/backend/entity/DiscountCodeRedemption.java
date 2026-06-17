package com.eventflow.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "discount_code_redemptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiscountCodeRedemption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "discount_code_id", nullable = false)
    private DiscountCode discountCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_transaction_id")
    private PaymentTransaction paymentTransaction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_code", nullable = false)
    private SubscriptionPlan plan;

    @Column(name = "original_amount_vnd", nullable = false)
    private Long originalAmountVnd;

    @Column(name = "discount_amount_vnd", nullable = false)
    private Long discountAmountVnd;

    @Column(name = "final_amount_vnd", nullable = false)
    private Long finalAmountVnd;

    @Column(name = "redeemed_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime redeemedAt = LocalDateTime.now();
}
