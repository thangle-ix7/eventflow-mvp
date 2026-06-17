package com.eventflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CheckoutRequestDTO {
    @NotBlank(message = "planCode không được để trống")
    private String planCode;

    private Long eventId;
}
