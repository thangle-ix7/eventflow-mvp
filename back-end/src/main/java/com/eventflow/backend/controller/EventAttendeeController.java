package com.eventflow.backend.controller;

import com.eventflow.backend.dto.AttendeeImportResponse;
import com.eventflow.backend.dto.AttendeeInviteEmailResponse;
import com.eventflow.backend.dto.CheckInRequest;
import com.eventflow.backend.dto.CheckInResponse;
import com.eventflow.backend.dto.CheckInSessionRequest;
import com.eventflow.backend.dto.CheckInSessionResponse;
import com.eventflow.backend.dto.EventAttendeeRequest;
import com.eventflow.backend.dto.EventAttendeeResponse;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.EventAttendeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping({"/api/events/{eventId}/attendees", "/api/v1/events/{eventId}/attendees"})
@RequiredArgsConstructor
public class EventAttendeeController {
    private final EventAttendeeService eventAttendeeService;
    private final EventSecurityService eventSecurityService;

    @GetMapping("/sessions")
    public ResponseEntity<List<CheckInSessionResponse>> getSessions(
            @PathVariable Long eventId,
            Authentication authentication) {
        if (!isMember(eventId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventAttendeeService.getSessions(eventId));
    }

    @PostMapping("/sessions")
    public ResponseEntity<CheckInSessionResponse> createSession(
            @PathVariable Long eventId,
            @Valid @RequestBody CheckInSessionRequest request,
            Authentication authentication) {
        if (!isLeader(eventId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(eventAttendeeService.createSession(eventId, request));
    }

    @GetMapping
    public ResponseEntity<List<EventAttendeeResponse>> getAttendees(
            @PathVariable Long eventId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long sessionId,
            Authentication authentication) {
        if (!isMember(eventId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventAttendeeService.getAttendees(eventId, status, sessionId));
    }

    @PostMapping
    public ResponseEntity<EventAttendeeResponse> createAttendee(
            @PathVariable Long eventId,
            @Valid @RequestBody EventAttendeeRequest request,
            Authentication authentication) {
        if (!isLeader(eventId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(eventAttendeeService.createAttendee(eventId, request));
    }

    @GetMapping("/import-template")
    public ResponseEntity<byte[]> downloadImportTemplate(
            @PathVariable Long eventId,
            Authentication authentication) {
        if (!isLeader(eventId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        byte[] file = eventAttendeeService.buildAttendeeImportTemplate();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("eventflow-checkin-attendees-template.xlsx")
                        .build()
                        .toString())
                .body(file);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AttendeeImportResponse> importAttendees(
            @PathVariable Long eventId,
            @RequestParam Long sessionId,
            @RequestPart("file") MultipartFile file,
            Authentication authentication) {
        if (!isLeader(eventId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventAttendeeService.importAttendees(eventId, sessionId, file));
    }

    @PutMapping("/{attendeeId}")
    public ResponseEntity<EventAttendeeResponse> updateAttendee(
            @PathVariable Long eventId,
            @PathVariable Long attendeeId,
            @Valid @RequestBody EventAttendeeRequest request,
            Authentication authentication) {
        if (!isLeader(eventId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventAttendeeService.updateAttendee(eventId, attendeeId, request));
    }

    @DeleteMapping("/{attendeeId}")
    public ResponseEntity<Void> deleteAttendee(
            @PathVariable Long eventId,
            @PathVariable Long attendeeId,
            Authentication authentication) {
        if (!isLeader(eventId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        eventAttendeeService.deleteAttendee(eventId, attendeeId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{attendeeId}/confirm")
    public ResponseEntity<EventAttendeeResponse> confirmAttendee(
            @PathVariable Long eventId,
            @PathVariable Long attendeeId,
            Authentication authentication) {
        if (!isLeader(eventId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventAttendeeService.confirmAttendee(eventId, attendeeId));
    }

    @PostMapping("/{attendeeId}/send-invitation")
    public ResponseEntity<AttendeeInviteEmailResponse> sendAttendeeInvitation(
            @PathVariable Long eventId,
            @PathVariable Long attendeeId,
            Authentication authentication) {
        if (!isLeader(eventId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventAttendeeService.sendAttendeeInvitation(eventId, attendeeId));
    }

    @PostMapping("/sessions/{sessionId}/send-invitations")
    public ResponseEntity<AttendeeInviteEmailResponse> sendSessionInvitations(
            @PathVariable Long eventId,
            @PathVariable Long sessionId,
            Authentication authentication) {
        if (!isLeader(eventId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventAttendeeService.sendSessionInvitations(eventId, sessionId));
    }

    @PostMapping("/check-in")
    public ResponseEntity<CheckInResponse> checkIn(
            @PathVariable Long eventId,
            @Valid @RequestBody CheckInRequest request,
            Authentication authentication) {
        if (!isMember(eventId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(eventAttendeeService.checkIn(eventId, currentUserId(authentication), request));
    }

    private boolean isMember(Long eventId, Authentication authentication) {
        return eventSecurityService.isMemberOfEvent(eventId, currentUserId(authentication));
    }

    private boolean isLeader(Long eventId, Authentication authentication) {
        return eventSecurityService.isLeaderOfEvent(eventId, currentUserId(authentication));
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
