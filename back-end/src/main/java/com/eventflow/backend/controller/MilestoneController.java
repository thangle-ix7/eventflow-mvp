package com.eventflow.backend.controller;

import com.eventflow.backend.dto.MilestoneRequestDTO;
import com.eventflow.backend.dto.MilestoneResponseDTO;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.MilestoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/events/{eventId}/milestones", "/api/v1/events/{eventId}/milestones"})
@RequiredArgsConstructor
public class MilestoneController {

    private final MilestoneService milestoneService;
    private final EventSecurityService eventSecurityService;

    @GetMapping
    public ResponseEntity<List<MilestoneResponseDTO>> getMilestones(
            @PathVariable Long eventId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(milestoneService.getMilestones(eventId));
    }

    @PostMapping
    public ResponseEntity<MilestoneResponseDTO> createMilestone(
            @PathVariable Long eventId,
            @Valid @RequestBody MilestoneRequestDTO request,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        MilestoneResponseDTO response = milestoneService.createMilestone(eventId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{milestoneId}")
    public ResponseEntity<MilestoneResponseDTO> updateMilestone(
            @PathVariable Long eventId,
            @PathVariable Long milestoneId,
            @Valid @RequestBody MilestoneRequestDTO request,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(milestoneService.updateMilestone(eventId, milestoneId, request));
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
