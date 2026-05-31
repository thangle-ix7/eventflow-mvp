package com.eventflow.backend.controller;

import com.eventflow.backend.dto.DepartmentTasksDTO;
import com.eventflow.backend.dto.StatusUpdateRequest;
import com.eventflow.backend.dto.TaskRequestDTO;
import com.eventflow.backend.dto.TaskResponseDTO;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final EventSecurityService eventSecurityService;

    @GetMapping("/events/{eventId}/tasks")
    public ResponseEntity<List<DepartmentTasksDTO>> getEventTasks(
            @PathVariable Long eventId,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(taskService.getTasksByEvent(eventId));
    }

    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<TaskResponseDTO> getTask(
            @PathVariable Long taskId,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(taskService.getTask(taskId));
    }

    @PostMapping("/events/{eventId}/tasks")
    public ResponseEntity<TaskResponseDTO> createTask(
            @PathVariable Long eventId,
            @Valid @RequestBody TaskRequestDTO request,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        TaskResponseDTO response = taskService.createTask(eventId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/tasks/{taskId}")
    public ResponseEntity<TaskResponseDTO> updateTask(
            @PathVariable Long taskId,
            @Valid @RequestBody TaskRequestDTO request,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(taskService.updateTask(taskId, request));
    }

    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<Void> deleteTask(
            @PathVariable Long taskId,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        taskService.deleteTask(taskId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/tasks/{taskId}/status")
    public ResponseEntity<Void> updateTaskStatus(
            @PathVariable Long taskId,
            @RequestBody StatusUpdateRequest request,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();

        // Resolve eventId from task to check LEADER role
        Long eventId = taskService.getEventIdByTaskId(taskId);

        // Allow if user is assignee OR LEADER of the event
        boolean isAssignee = eventSecurityService.isTaskAssignee(taskId, userId);
        boolean isLeader = eventSecurityService.isLeaderOfEvent(eventId, userId);

        if (!isAssignee && !isLeader) {
            return ResponseEntity.status(403).build();
        }

        taskService.updateStatus(taskId, taskService.parseStatus(request.getStatus()));
        return ResponseEntity.noContent().build();
    }
}
