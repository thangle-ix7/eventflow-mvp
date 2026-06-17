package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DiscountCodeResponseDTO {
    private Long id;
    private String code;
    private String description;
    private boolean active;
    private Integer discountPercent;
    private String targetPlanCode;
    private String targetPlanName;
    private Integer maxRedemptions;
    private Integer redeemedCount;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
