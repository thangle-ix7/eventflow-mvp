package com.eventflow.backend.controller;

import com.eventflow.backend.dto.DepartmentLeaderSnapshotResponse;
import com.eventflow.backend.dto.LeaderSnapshotResponse;
import com.eventflow.backend.dto.PageResponse;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.LeaderSnapshotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api", "/api/v1"})
@RequiredArgsConstructor
public class LeaderSnapshotController {

    private final LeaderSnapshotService leaderSnapshotService;
    private final EventSecurityService eventSecurityService;

    @GetMapping("/events/{eventId}/leader-snapshot")
    public ResponseEntity<LeaderSnapshotResponse> getLeaderSnapshot(
            @PathVariable Long eventId,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(leaderSnapshotService.getLeaderSnapshot(eventId));
    }

    @GetMapping("/events/{eventId}/leader-snapshot/priority-tasks")
    public ResponseEntity<PageResponse<LeaderSnapshotResponse.CriticalItem>> getPriorityTasks(
            @PathVariable Long eventId,
            @RequestParam String priority,
            @RequestParam(required = false) Long milestoneId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(leaderSnapshotService.getPriorityTasks(eventId, priority, milestoneId, page, size));
    }

    @GetMapping("/events/{eventId}/departments/{departmentId}/leader-snapshot")
    public ResponseEntity<DepartmentLeaderSnapshotResponse> getDepartmentLeaderSnapshot(
            @PathVariable Long eventId,
            @PathVariable Long departmentId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        boolean canView = eventSecurityService.isLeaderOfEvent(eventId, userId)
                || eventSecurityService.isDepartmentLeader(eventId, departmentId, userId);
        if (!canView) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(leaderSnapshotService.getDepartmentLeaderSnapshot(eventId, departmentId));
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
