package com.eventflow.backend.controller;

import com.eventflow.backend.dto.FeedbackAdminResponseRequest;
import com.eventflow.backend.dto.FeedbackRequestDTO;
import com.eventflow.backend.dto.FeedbackResponseDTO;
import com.eventflow.backend.entity.FeedbackStatus;
import com.eventflow.backend.security.AdminSecurityService;
import com.eventflow.backend.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api", "/api/v1"})
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;
    private final AdminSecurityService adminSecurityService;

    @PostMapping("/feedback")
    public ResponseEntity<FeedbackResponseDTO> submitFeedback(
            @Valid @RequestBody FeedbackRequestDTO request,
            Authentication authentication) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(feedbackService.submitFeedback(currentUserId(authentication), request));
    }

    @GetMapping("/admin/feedback")
    public ResponseEntity<Page<FeedbackResponseDTO>> getFeedbackForAdmin(
            @RequestParam(required = false) FeedbackStatus status,
            @RequestParam(required = false) Long eventId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        if (!adminSecurityService.isAdmin(currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(feedbackService.getFeedbackForAdmin(status, eventId, page, size));
    }

    @PutMapping("/admin/feedback/{feedbackId}/response")
    public ResponseEntity<FeedbackResponseDTO> respondToFeedback(
            @PathVariable Long feedbackId,
            @Valid @RequestBody FeedbackAdminResponseRequest request,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!adminSecurityService.isAdmin(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(feedbackService.respondToFeedback(feedbackId, userId, request));
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
