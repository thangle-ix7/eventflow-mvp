package com.eventflow.backend.controller;

import com.eventflow.backend.dto.*;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/subscriptions", "/api/v1/subscriptions"})
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final EventSecurityService eventSecurityService;

    @GetMapping("/plans")
    public ResponseEntity<List<SubscriptionPlanDTO>> getPlans() {
        return ResponseEntity.ok(subscriptionService.getPlans());
    }

    @GetMapping("/me")
    public ResponseEntity<SubscriptionOverviewDTO> getCurrentSubscription(Authentication authentication) {
        return ResponseEntity.ok(subscriptionService.getUserOverview(currentUserId(authentication)));
    }

    @GetMapping("/events/{eventId}/entitlement")
    public ResponseEntity<EventEntitlementDTO> getEventEntitlement(
            @PathVariable Long eventId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(subscriptionService.getEventEntitlement(eventId));
    }

    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResponseDTO> createCheckout(
            @Valid @RequestBody CheckoutRequestDTO request,
            Authentication authentication) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(subscriptionService.createCheckout(currentUserId(authentication), request));
    }

    @PostMapping("/payments/payos/webhook")
    public ResponseEntity<Map<String, String>> handlePayOsWebhook(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(subscriptionService.handlePayOsWebhook(payload));
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
