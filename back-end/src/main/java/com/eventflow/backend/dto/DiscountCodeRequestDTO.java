package com.eventflow.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DiscountCodeRequestDTO {
    @Size(max = 80, message = "code tối đa 80 ký tự")
    private String code;

    @Size(max = 255, message = "description tối đa 255 ký tự")
    private String description;

    private Boolean active;

    @Min(value = 1, message = "discountPercent phải từ 1 đến 100")
    @Max(value = 100, message = "discountPercent phải từ 1 đến 100")
    private Integer discountPercent;

    private String targetPlanCode;

    @Min(value = 1, message = "maxRedemptions phải lớn hơn 0")
    private Integer maxRedemptions;

    private LocalDateTime expiresAt;
}
