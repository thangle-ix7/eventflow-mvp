package com.eventflow.backend.controller;

import com.eventflow.backend.dto.EventRequestDTO;
import com.eventflow.backend.dto.EventResponseDTO;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final EventSecurityService eventSecurityService;

    @GetMapping
    public ResponseEntity<List<EventResponseDTO>> getMyEvents(Authentication authentication) {
        return ResponseEntity.ok(eventService.getEventsForUser(currentUserId(authentication)));
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<EventResponseDTO> getEvent(
            @PathVariable Long eventId,
            Authentication authentication) {

        return ResponseEntity.ok(eventService.getEventForUser(eventId, currentUserId(authentication)));
    }

    @PostMapping
    public ResponseEntity<EventResponseDTO> createEvent(
            @Valid @RequestBody EventRequestDTO request,
            Authentication authentication) {

        EventResponseDTO response = eventService.createEvent(request, currentUserId(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{eventId}")
    public ResponseEntity<EventResponseDTO> updateEvent(
            @PathVariable Long eventId,
            @Valid @RequestBody EventRequestDTO request,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventService.updateEvent(eventId, request));
    }

    @DeleteMapping("/{eventId}")
    public ResponseEntity<Void> deleteEvent(
            @PathVariable Long eventId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        eventService.deleteEvent(eventId);
        return ResponseEntity.noContent().build();
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
