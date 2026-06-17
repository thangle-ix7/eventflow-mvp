package com.eventflow.backend.controller;

import com.eventflow.backend.dto.*;
import com.eventflow.backend.security.AdminSecurityService;
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
    private final AdminSecurityService adminSecurityService;

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

    @GetMapping("/admin/discount-codes")
    public ResponseEntity<List<DiscountCodeResponseDTO>> getDiscountCodes(Authentication authentication) {
        Long userId = currentUserId(authentication);
        if (!adminSecurityService.canManageDiscountCodes(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(subscriptionService.getDiscountCodes());
    }

    @PostMapping("/admin/discount-codes")
    public ResponseEntity<DiscountCodeResponseDTO> createDiscountCode(
            @Valid @RequestBody DiscountCodeRequestDTO request,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!adminSecurityService.canManageDiscountCodes(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(subscriptionService.createDiscountCode(userId, request));
    }

    @PutMapping("/admin/discount-codes/{discountCodeId}")
    public ResponseEntity<DiscountCodeResponseDTO> updateDiscountCode(
            @PathVariable Long discountCodeId,
            @Valid @RequestBody DiscountCodeRequestDTO request,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!adminSecurityService.canManageDiscountCodes(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(subscriptionService.updateDiscountCode(discountCodeId, request));
    }

    @DeleteMapping("/admin/discount-codes/{discountCodeId}")
    public ResponseEntity<Void> deactivateDiscountCode(
            @PathVariable Long discountCodeId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!adminSecurityService.canManageDiscountCodes(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        subscriptionService.deactivateDiscountCode(discountCodeId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/payments/payos/webhook")
    public ResponseEntity<Map<String, String>> handlePayOsWebhook(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(subscriptionService.handlePayOsWebhook(payload));
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
