package com.eventflow.backend.controller;

import com.eventflow.backend.dto.TaskAttachmentResponseDTO;
import com.eventflow.backend.dto.TaskAttachmentUpdateRequest;
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
        if (!canViewTask(taskId, eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(taskAttachmentService.getTaskAttachments(taskId, userId));
    }

    @PostMapping(value = "/tasks/{taskId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<List<TaskAttachmentResponseDTO>> uploadTaskAttachments(
            @PathVariable Long taskId,
            @RequestPart(required = false) List<MultipartFile> files,
            @RequestParam(required = false) String linkUrl,
            @RequestParam(required = false) String linkTitle,
            @RequestParam(required = false) String visibility,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        Long eventId = taskService.getEventIdByTaskId(taskId);
        boolean leader = eventSecurityService.isLeaderOfEvent(eventId, userId);
        if (!canAttachToTask(taskId, eventId, userId, leader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskAttachmentService.uploadTaskAttachments(taskId, userId, leader, visibility, files, linkUrl, linkTitle));
    }

    @GetMapping("/task-attachments/{attachmentId}/download")
    public ResponseEntity<?> downloadTaskAttachment(
            @PathVariable Long attachmentId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        if (!taskAttachmentService.canViewAttachment(attachmentId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        var attachment = taskAttachmentService.getAttachmentDownload(attachmentId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(10, TimeUnit.MINUTES).cachePrivate())
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + attachment.originalName() + "\"")
                .contentType(MediaType.parseMediaType(attachment.contentType() != null ? attachment.contentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE))
                .contentLength(attachment.sizeBytes())
                .body(attachment.resource());
    }

    @PutMapping("/task-attachments/{attachmentId}")
    public ResponseEntity<TaskAttachmentResponseDTO> updateTaskAttachment(
            @PathVariable Long attachmentId,
            @RequestBody TaskAttachmentUpdateRequest request,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        Long eventId = taskAttachmentService.getAttachmentEventId(attachmentId);
        boolean leader = eventSecurityService.isLeaderOfEvent(eventId, userId);
        return ResponseEntity.ok(taskAttachmentService.updateAttachment(attachmentId, userId, leader, request));
    }

    @DeleteMapping("/task-attachments/{attachmentId}")
    public ResponseEntity<Void> deleteTaskAttachment(
            @PathVariable Long attachmentId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        Long eventId = taskAttachmentService.getAttachmentEventId(attachmentId);
        boolean leader = eventSecurityService.isLeaderOfEvent(eventId, userId);
        taskAttachmentService.deleteAttachment(attachmentId, userId, leader);
        return ResponseEntity.noContent().build();
    }

    private boolean canAttachToTask(Long taskId, Long eventId, Long userId, boolean leader) {
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)) {
            return false;
        }
        return leader || eventSecurityService.isTaskAssignee(taskId, userId);
    }

    private boolean canViewTask(Long taskId, Long eventId, Long userId) {
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)) {
            return false;
        }
        return eventSecurityService.isLeaderOfEvent(eventId, userId)
                || eventSecurityService.isTaskAssignee(taskId, userId);
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
