package com.eventflow.backend.controller;

import com.eventflow.backend.dto.CalendarMonthResponse;
import com.eventflow.backend.dto.DashboardPeriodComparisonDTO;
import com.eventflow.backend.dto.EventCalendarItemRequest;
import com.eventflow.backend.dto.EventDocumentDTO;
import com.eventflow.backend.dto.EventReportsResponse;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.EventUtilityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping({"/api", "/api/v1"})
@RequiredArgsConstructor
public class EventUtilityController {

    private final EventUtilityService eventUtilityService;
    private final EventSecurityService eventSecurityService;

    @GetMapping("/events/{eventId}/calendar")
    public ResponseEntity<CalendarMonthResponse> getCalendarMonth(
            @PathVariable Long eventId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            Authentication authentication) {

        if (!eventSecurityService.isMemberOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventUtilityService.getCalendarMonth(eventId, year, month));
    }

    @PostMapping("/events/{eventId}/calendar")
    public ResponseEntity<?> createCalendarItem(
            @PathVariable Long eventId,
            @Valid @RequestBody EventCalendarItemRequest request,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventUtilityService.createCalendarItem(eventId, currentUserId(authentication), request));
    }

    @GetMapping("/events/{eventId}/documents")
    public ResponseEntity<List<EventDocumentDTO>> getEventDocuments(
            @PathVariable Long eventId,
            Authentication authentication) {

        if (!eventSecurityService.isMemberOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventUtilityService.getEventDocuments(eventId));
    }

    @GetMapping("/events/{eventId}/reports")
    public ResponseEntity<EventReportsResponse> getEventReports(
            @PathVariable Long eventId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            Authentication authentication) {

        if (!eventSecurityService.isMemberOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventUtilityService.getEventReports(eventId, fromDate, toDate));
    }

    @GetMapping("/events/{eventId}/dashboard/comparison")
    public ResponseEntity<DashboardPeriodComparisonDTO> getDashboardComparison(
            @PathVariable Long eventId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventUtilityService.getDashboardComparison(eventId, fromDate, toDate));
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
