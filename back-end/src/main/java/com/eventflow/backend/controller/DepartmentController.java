package com.eventflow.backend.controller;

import com.eventflow.backend.dto.DepartmentMemberAssignRequest;
import com.eventflow.backend.dto.DepartmentRequestDTO;
import com.eventflow.backend.dto.DepartmentResponseDTO;
import com.eventflow.backend.dto.EventMemberResponseDTO;
import com.eventflow.backend.dto.PageResponse;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/events/{eventId}/departments", "/api/v1/events/{eventId}/departments"})
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;
    private final EventSecurityService eventSecurityService;

    @GetMapping
    public ResponseEntity<PageResponse<DepartmentResponseDTO>> getDepartments(
            @PathVariable Long eventId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "name") String sort,
            @RequestParam(defaultValue = "asc") String direction,
            @RequestParam(required = false) String search,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.ok(departmentService.getDepartmentsForMember(eventId, userId, page, size, search));
        }

        return ResponseEntity.ok(departmentService.getDepartments(eventId, page, size, sort, direction, search));
    }

    @GetMapping("/{departmentId}")
    public ResponseEntity<DepartmentResponseDTO> getDepartment(
            @PathVariable Long eventId,
            @PathVariable Long departmentId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.ok(departmentService.getDepartmentForMember(eventId, departmentId, userId));
        }

        return ResponseEntity.ok(departmentService.getDepartment(eventId, departmentId));
    }

    @GetMapping("/{departmentId}/members")
    public ResponseEntity<List<EventMemberResponseDTO>> getDepartmentMembers(
            @PathVariable Long eventId,
            @PathVariable Long departmentId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.ok(departmentService.getDepartmentMembersForMember(eventId, departmentId, userId));
        }

        return ResponseEntity.ok(departmentService.getDepartmentMembers(eventId, departmentId));
    }

    @PostMapping
    public ResponseEntity<DepartmentResponseDTO> createDepartment(
            @PathVariable Long eventId,
            @Valid @RequestBody DepartmentRequestDTO request,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        DepartmentResponseDTO response = departmentService.createDepartment(eventId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{departmentId}")
    public ResponseEntity<DepartmentResponseDTO> updateDepartment(
            @PathVariable Long eventId,
            @PathVariable Long departmentId,
            @Valid @RequestBody DepartmentRequestDTO request,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(departmentService.updateDepartment(eventId, departmentId, request));
    }

    @PostMapping("/{departmentId}/members")
    public ResponseEntity<EventMemberResponseDTO> assignMember(
            @PathVariable Long eventId,
            @PathVariable Long departmentId,
            @Valid @RequestBody DepartmentMemberAssignRequest request,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(departmentService.assignMember(eventId, departmentId, request.getUserId()));
    }

    @DeleteMapping("/{departmentId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long eventId,
            @PathVariable Long departmentId,
            @PathVariable Long userId,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        departmentService.removeMember(eventId, departmentId, userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{departmentId}")
    public ResponseEntity<Void> deleteDepartment(
            @PathVariable Long eventId,
            @PathVariable Long departmentId,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        departmentService.deleteDepartment(eventId, departmentId);
        return ResponseEntity.noContent().build();
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
