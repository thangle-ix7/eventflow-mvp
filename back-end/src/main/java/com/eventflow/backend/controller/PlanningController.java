package com.eventflow.backend.controller;

import com.eventflow.backend.dto.PlanningPhaseRequestDTO;
import com.eventflow.backend.dto.PlanningPhaseResponseDTO;
import com.eventflow.backend.dto.PlanningRequestDTO;
import com.eventflow.backend.dto.PlanningResponseDTO;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.PlanningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/events/{eventId}/plannings", "/api/v1/events/{eventId}/plannings"})
@RequiredArgsConstructor
public class PlanningController {

    private final PlanningService planningService;
    private final EventSecurityService eventSecurityService;

    @GetMapping
    public ResponseEntity<List<PlanningResponseDTO>> getPlannings(
            @PathVariable Long eventId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(planningService.getPlannings(eventId));
    }

    @GetMapping("/{planningId}")
    public ResponseEntity<PlanningResponseDTO> getPlanning(
            @PathVariable Long eventId,
            @PathVariable Long planningId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(planningService.getPlanning(eventId, planningId));
    }

    @PostMapping
    public ResponseEntity<PlanningResponseDTO> createPlanning(
            @PathVariable Long eventId,
            @Valid @RequestBody PlanningRequestDTO request,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        PlanningResponseDTO response = planningService.createPlanning(eventId, userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{planningId}")
    public ResponseEntity<PlanningResponseDTO> updatePlanning(
            @PathVariable Long eventId,
            @PathVariable Long planningId,
            @Valid @RequestBody PlanningRequestDTO request,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(planningService.updatePlanning(eventId, planningId, request));
    }

    @DeleteMapping("/{planningId}")
    public ResponseEntity<Void> deletePlanning(
            @PathVariable Long eventId,
            @PathVariable Long planningId,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        planningService.deletePlanning(eventId, planningId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{planningId}/phases")
    public ResponseEntity<PlanningPhaseResponseDTO> createPhase(
            @PathVariable Long eventId,
            @PathVariable Long planningId,
            @Valid @RequestBody PlanningPhaseRequestDTO request,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        PlanningPhaseResponseDTO response = planningService.createPhase(eventId, planningId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{planningId}/phases/{phaseId}")
    public ResponseEntity<PlanningPhaseResponseDTO> updatePhase(
            @PathVariable Long eventId,
            @PathVariable Long planningId,
            @PathVariable Long phaseId,
            @Valid @RequestBody PlanningPhaseRequestDTO request,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(planningService.updatePhase(eventId, planningId, phaseId, request));
    }

    @DeleteMapping("/{planningId}/phases/{phaseId}")
    public ResponseEntity<Void> deletePhase(
            @PathVariable Long eventId,
            @PathVariable Long planningId,
            @PathVariable Long phaseId,
            Authentication authentication) {

        if (!eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        planningService.deletePhase(eventId, planningId, phaseId);
        return ResponseEntity.noContent().build();
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
