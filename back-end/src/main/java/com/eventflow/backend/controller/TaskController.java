package com.eventflow.backend.controller;

import com.eventflow.backend.dto.DepartmentTasksDTO;
import com.eventflow.backend.dto.StatusUpdateRequest;
import com.eventflow.backend.entity.TaskStatus;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.TaskService;
import lombok.RequiredArgsConstructor;
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
        if (!eventSecurityService.hasRoleInEvent(eventId, userId, "MEMBER")) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(taskService.getTasksByEvent(eventId));
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
        boolean isLeader = eventSecurityService.hasRoleInEvent(eventId, userId, "LEADER");

        if (!isAssignee && !isLeader) {
            return ResponseEntity.status(403).build();
        }

        taskService.updateStatus(taskId, TaskStatus.valueOf(request.getStatus().toUpperCase()));
        return ResponseEntity.noContent().build();
    }
}
