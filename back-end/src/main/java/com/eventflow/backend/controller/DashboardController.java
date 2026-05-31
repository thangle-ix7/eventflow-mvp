package com.eventflow.backend.controller;

import com.eventflow.backend.dto.DashboardSummaryDTO;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final EventSecurityService eventSecurityService;

    @GetMapping("/events/{eventId}/dashboard-summary")
    public ResponseEntity<DashboardSummaryDTO> getDashboardSummary(
            @PathVariable Long eventId,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        // Only LEADER can view dashboard summary
        if (!eventSecurityService.hasRoleInEvent(eventId, userId, "LEADER")) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(dashboardService.getEventDashboardSummary(eventId));
    }
}
