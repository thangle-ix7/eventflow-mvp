package com.eventflow.backend.controller;

import com.eventflow.backend.dto.EventMemberRequestDTO;
import com.eventflow.backend.dto.EventMemberResponseDTO;
import com.eventflow.backend.dto.EventMemberRoleUpdateRequest;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.EventMemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/events/{eventId}/members", "/api/v1/events/{eventId}/members"})
@RequiredArgsConstructor
public class EventMemberController {

    private final EventMemberService eventMemberService;
    private final EventSecurityService eventSecurityService;

    @GetMapping
    public ResponseEntity<List<EventMemberResponseDTO>> getMembers(
            @PathVariable Long eventId,
            Authentication authentication) {

        Long currentUserId = currentUserId(authentication);
        if (!eventSecurityService.isMemberOfEvent(eventId, currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId)) {
            return ResponseEntity.ok(eventMemberService.getMembersVisibleToMember(eventId, currentUserId));
        }

        return ResponseEntity.ok(eventMemberService.getMembers(eventId));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<EventMemberResponseDTO> getMember(
            @PathVariable Long eventId,
            @PathVariable Long userId,
            Authentication authentication) {

        Long currentUserId = currentUserId(authentication);
        if (!eventSecurityService.isMemberOfEvent(eventId, currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId)) {
            return ResponseEntity.ok(eventMemberService.getMemberVisibleToMember(eventId, userId, currentUserId));
        }

        return ResponseEntity.ok(eventMemberService.getMember(eventId, userId));
    }

    @PostMapping
    public ResponseEntity<EventMemberResponseDTO> addMember(
            @PathVariable Long eventId,
            @Valid @RequestBody EventMemberRequestDTO request,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(eventMemberService.addMember(eventId, request));
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<EventMemberResponseDTO> updateRole(
            @PathVariable Long eventId,
            @PathVariable Long userId,
            @Valid @RequestBody EventMemberRoleUpdateRequest request,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventMemberService.updateRole(eventId, userId, request));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long eventId,
            @PathVariable Long userId,
            Authentication authentication) {

        Long currentUserId = currentUserId(authentication);
        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        eventMemberService.removeMember(eventId, userId, currentUserId);
        return ResponseEntity.noContent().build();
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
