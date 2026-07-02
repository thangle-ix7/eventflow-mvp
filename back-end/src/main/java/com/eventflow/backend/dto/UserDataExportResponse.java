package com.eventflow.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record UserDataExportResponse(
        LocalDateTime generatedAt,
        UserProfileDTO profile,
        ConsentSnapshot consent,
        List<EventMembershipSnapshot> eventMemberships,
        List<PaymentSnapshot> payments) {

    public record ConsentSnapshot(
            String consentVersion,
            LocalDateTime consentAcceptedAt,
            LocalDateTime personalDataDeletedAt) {
    }

    public record EventMembershipSnapshot(
            Long eventId,
            String eventName,
            String role,
            LocalDateTime joinedAt) {
    }

    public record PaymentSnapshot(
            Long id,
            String provider,
            String providerOrderId,
            String planCode,
            Long amountVnd,
            String status,
            LocalDateTime createdAt,
            LocalDateTime paidAt) {
    }
}
