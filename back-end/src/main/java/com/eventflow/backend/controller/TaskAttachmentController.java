package com.eventflow.backend.controller;

import com.eventflow.backend.dto.TaskAttachmentResponseDTO;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.TaskAttachmentService;
import com.eventflow.backend.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping({"/api", "/api/v1"})
@RequiredArgsConstructor
public class TaskAttachmentController {

    private final TaskAttachmentService taskAttachmentService;
    private final TaskService taskService;
    private final EventSecurityService eventSecurityService;

    @GetMapping("/tasks/{taskId}/attachments")
    public ResponseEntity<List<TaskAttachmentResponseDTO>> getTaskAttachments(
            @PathVariable Long taskId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(taskAttachmentService.getTaskAttachments(taskId));
    }

    @PostMapping(value = "/tasks/{taskId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<List<TaskAttachmentResponseDTO>> uploadTaskAttachments(
            @PathVariable Long taskId,
            @RequestPart List<MultipartFile> files,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!canAttachToTask(taskId, eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskAttachmentService.uploadTaskAttachments(taskId, userId, files));
    }

    @GetMapping("/task-attachments/{attachmentId}/download")
    public ResponseEntity<?> downloadTaskAttachment(
            @PathVariable Long attachmentId,
            Authentication authentication) {

        var attachment = taskAttachmentService.getAttachmentDownload(attachmentId);
        Long userId = currentUserId(authentication);
        if (!eventSecurityService.isMemberOfEvent(attachment.eventId(), userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(10, TimeUnit.MINUTES).cachePrivate())
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + attachment.originalName() + "\"")
                .contentType(MediaType.parseMediaType(attachment.contentType() != null ? attachment.contentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE))
                .contentLength(attachment.sizeBytes())
                .body(attachment.resource());
    }

    private boolean canAttachToTask(Long taskId, Long eventId, Long userId) {
        return eventSecurityService.isLeaderOfEvent(eventId, userId)
                || eventSecurityService.isTaskAssignee(taskId, userId);
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
