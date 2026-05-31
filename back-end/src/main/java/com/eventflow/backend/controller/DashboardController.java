package com.eventflow.backend.controller;

import com.eventflow.backend.dto.CategoryMetricDTO;
import com.eventflow.backend.dto.ChartPointDTO;
import com.eventflow.backend.dto.DashboardSummaryDTO;
import com.eventflow.backend.dto.DepartmentDashboardSummaryDTO;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping({"/api", "/api/v1"})
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
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(dashboardService.getEventDashboardSummary(eventId));
    }

    @GetMapping("/events/{eventId}/dashboard/task-trend")
    public ResponseEntity<List<ChartPointDTO>> getEventTaskTrend(
            @PathVariable Long eventId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(dashboardService.getEventTaskTrend(eventId, fromDate, toDate));
    }

    @GetMapping("/events/{eventId}/dashboard/tasks-by-department")
    public ResponseEntity<List<CategoryMetricDTO>> getEventTasksByDepartment(
            @PathVariable Long eventId,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(dashboardService.getEventTasksByDepartment(eventId));
    }

    @GetMapping("/events/{eventId}/dashboard/tasks-by-assignee")
    public ResponseEntity<List<CategoryMetricDTO>> getEventTasksByAssignee(
            @PathVariable Long eventId,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(dashboardService.getEventTasksByAssignee(eventId));
    }

    @GetMapping("/events/{eventId}/dashboard/tasks-by-status")
    public ResponseEntity<List<CategoryMetricDTO>> getEventTasksByStatus(
            @PathVariable Long eventId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(dashboardService.getEventTasksByStatus(eventId, fromDate, toDate));
    }

    @GetMapping("/events/{eventId}/departments/{departmentId}/dashboard-summary")
    public ResponseEntity<DepartmentDashboardSummaryDTO> getDepartmentDashboardSummary(
            @PathVariable Long eventId,
            @PathVariable Long departmentId,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(dashboardService.getDepartmentDashboardSummary(eventId, departmentId));
    }

    @GetMapping("/events/{eventId}/departments/{departmentId}/dashboard/task-trend")
    public ResponseEntity<List<ChartPointDTO>> getDepartmentTaskTrend(
            @PathVariable Long eventId,
            @PathVariable Long departmentId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(dashboardService.getDepartmentTaskTrend(eventId, departmentId, fromDate, toDate));
    }

    @GetMapping("/events/{eventId}/departments/{departmentId}/dashboard/tasks-by-assignee")
    public ResponseEntity<List<CategoryMetricDTO>> getDepartmentTasksByAssignee(
            @PathVariable Long eventId,
            @PathVariable Long departmentId,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(dashboardService.getDepartmentTasksByAssignee(eventId, departmentId));
    }

    @GetMapping("/events/{eventId}/departments/{departmentId}/dashboard/tasks-by-status")
    public ResponseEntity<List<CategoryMetricDTO>> getDepartmentTasksByStatus(
            @PathVariable Long eventId,
            @PathVariable Long departmentId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(dashboardService.getDepartmentTasksByStatus(eventId, departmentId, fromDate, toDate));
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
