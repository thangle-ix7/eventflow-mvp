package com.eventflow.backend.controller;

import com.eventflow.backend.dto.EventRequestDTO;
import com.eventflow.backend.dto.EventResponseDTO;
import com.eventflow.backend.dto.PageResponse;
import com.eventflow.backend.dto.TemplateInstantiateRequestDTO;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.security.AdminSecurityService;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.EventService;
import com.eventflow.backend.service.TemplateInstantiationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/events", "/api/v1/events"})
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final EventSecurityService eventSecurityService;
    private final TemplateInstantiationService templateInstantiationService;
    private final AdminSecurityService adminSecurityService;

    @GetMapping
    public ResponseEntity<PageResponse<EventResponseDTO>> getMyEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "eventDate") String sort,
            @RequestParam(defaultValue = "asc") String direction,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Authentication authentication) {

        return ResponseEntity.ok(eventService.getEventsForUser(
                currentUserId(authentication),
                page,
                size,
                sort,
                direction,
                status,
                search));
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

    // Template APIs

    @GetMapping("/templates")
    public ResponseEntity<PageResponse<EventResponseDTO>> getTemplates(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name") String sort,
            @RequestParam(defaultValue = "asc") String direction,
            @RequestParam(required = false) String search) {

        return ResponseEntity.ok(eventService.getTemplates(page, size, sort, direction, search));
    }

    @GetMapping("/templates/{templateId}")
    public ResponseEntity<EventResponseDTO> getTemplate(@PathVariable Long templateId) {
        return ResponseEntity.ok(eventService.getTemplate(templateId));
    }

    @PostMapping("/templates/{templateId}/instantiate")
    public ResponseEntity<EventResponseDTO> instantiateTemplate(
            @PathVariable Long templateId,
            @Valid @RequestBody TemplateInstantiateRequestDTO request,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        Event newEvent = templateInstantiationService.instantiateTemplate(templateId, request, userId);

        // Lấy thông tin event vừa tạo cho user hiện tại
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventService.getEventForUser(newEvent.getId(), userId));
    }

    // Admin Template Management APIs

    @PostMapping("/admin/templates")
    public ResponseEntity<EventResponseDTO> createTemplate(
            @Valid @RequestBody EventRequestDTO request,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!adminSecurityService.canManageTemplates(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Tạo template (không cần EventMember vì template là public)
        EventResponseDTO response = eventService.createTemplate(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/admin/templates/{templateId}")
    public ResponseEntity<EventResponseDTO> updateTemplate(
            @PathVariable Long templateId,
            @Valid @RequestBody EventRequestDTO request,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!adminSecurityService.canManageTemplates(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventService.updateTemplate(templateId, request));
    }

    @DeleteMapping("/admin/templates/{templateId}")
    public ResponseEntity<Void> deleteTemplate(
            @PathVariable Long templateId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!adminSecurityService.canManageTemplates(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        eventService.deleteTemplate(templateId);
        return ResponseEntity.noContent().build();
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
