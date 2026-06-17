package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CheckoutResponseDTO {
    private Long transactionId;
    private String provider;
    private String status;
    private String planCode;
    private Long amountVnd;
    private String checkoutUrl;
    private String changeType;
    private String message;
}
