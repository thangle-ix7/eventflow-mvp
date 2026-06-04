package com.eventflow.backend.controller;

import com.eventflow.backend.dto.TaskReportResponseDTO;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.TaskReportService;
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
public class TaskReportController {

    private final TaskReportService taskReportService;
    private final TaskService taskService;
    private final EventSecurityService eventSecurityService;

    @GetMapping("/tasks/{taskId}/reports")
    public ResponseEntity<List<TaskReportResponseDTO>> getTaskReports(
            @PathVariable Long taskId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!canViewTask(taskId, eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(taskReportService.getTaskReports(taskId));
    }

    @PostMapping(value = "/tasks/{taskId}/reports", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TaskReportResponseDTO> createTaskReport(
            @PathVariable Long taskId,
            @RequestParam Integer progressPercentage,
            @RequestParam String description,
            @RequestPart(required = false) MultipartFile image,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!canReportTask(taskId, eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        TaskReportResponseDTO response = taskReportService.createTaskReport(
                taskId,
                userId,
                progressPercentage,
                description,
                image);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping(value = "/task-reports/{reportId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TaskReportResponseDTO> updateTaskReport(
            @PathVariable Long reportId,
            @RequestParam Integer progressPercentage,
            @RequestParam String description,
            @RequestPart(required = false) MultipartFile image,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        Long eventId = taskReportService.getReportEventId(reportId);
        boolean isReporter = taskReportService.getReportReporterId(reportId).equals(userId);
        boolean isLeader = eventSecurityService.isLeaderOfEvent(eventId, userId);
        boolean isMember = eventSecurityService.isMemberOfEvent(eventId, userId);
        if (!isMember || (!isReporter && !isLeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(taskReportService.updateTaskReport(reportId, progressPercentage, description, image));
    }

    @GetMapping("/task-reports/{reportId}/image")
    public ResponseEntity<?> getTaskReportImage(
            @PathVariable Long reportId,
            Authentication authentication) {

        Long userId = currentUserId(authentication);
        Long taskId = taskReportService.getReportTaskId(reportId);
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!canViewTask(taskId, eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        var image = taskReportService.getReportImage(reportId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(10, TimeUnit.MINUTES).cachePrivate())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + image.originalName() + "\"")
                .contentType(MediaType.parseMediaType(image.contentType()))
                .body(image.resource());
    }

    private boolean canReportTask(Long taskId, Long eventId, Long userId) {
        return canViewTask(taskId, eventId, userId);
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
