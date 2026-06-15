package com.eventflow.backend.controller;

import com.eventflow.backend.dto.DepartmentWorkloadResponse;
import com.eventflow.backend.dto.EventWorkloadResponse;
import com.eventflow.backend.dto.MemberWorkloadResponse;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.WorkloadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * WorkloadController cung cấp API dashboard workload.
 *
 * API chỉ đọc dữ liệu.
 * Không cập nhật database.
 * Không chặn assign task.
 */
@RestController
@RequestMapping({"/api", "/api/v1"})
@RequiredArgsConstructor
public class WorkloadController {

    private final WorkloadService workloadService;
    private final EventSecurityService eventSecurityService;

    /**
     * Event Leader xem workload toàn event.
     */
    @GetMapping("/events/{eventId}/workload")
    public ResponseEntity<EventWorkloadResponse> getEventWorkload(
            @PathVariable Long eventId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);

        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(workloadService.getEventWorkload(eventId));
    }

    /**
     * Event Leader hoặc Department Leader xem workload của department.
     */
    @GetMapping("/events/{eventId}/departments/{departmentId}/workload")
    public ResponseEntity<DepartmentWorkloadResponse> getDepartmentWorkload(
            @PathVariable Long eventId,
            @PathVariable Long departmentId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);

        boolean canView = eventSecurityService.isLeaderOfEvent(eventId, userId)
                || eventSecurityService.isDepartmentLeader(eventId, departmentId, userId);

        if (!canView) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(workloadService.getDepartmentWorkload(eventId, departmentId));
    }

    /**
     * Leader xem member bất kỳ trong event.
     * Member chỉ xem workload của chính mình.
     */
    @GetMapping("/events/{eventId}/members/{memberId}/workload")
    public ResponseEntity<MemberWorkloadResponse> getMemberWorkload(
            @PathVariable Long eventId,
            @PathVariable Long memberId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);

        boolean isLeader = eventSecurityService.isLeaderOfEvent(eventId, userId);
        boolean isSelf = userId.equals(memberId);

        if (!isLeader && !isSelf) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (!eventSecurityService.isMemberOfEvent(eventId, memberId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        return ResponseEntity.ok(workloadService.getMemberWorkload(eventId, memberId));
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}