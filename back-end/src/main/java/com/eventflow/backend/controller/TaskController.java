package com.eventflow.backend.controller;

import com.eventflow.backend.dto.DepartmentTasksDTO;
import com.eventflow.backend.dto.PageResponse;
import com.eventflow.backend.dto.PriorityUpdateRequest;
import com.eventflow.backend.dto.StatusUpdateRequest;
import com.eventflow.backend.dto.TaskAssignmentRequest;
import com.eventflow.backend.dto.TaskRequestDTO;
import com.eventflow.backend.dto.TaskResponseDTO;
import com.eventflow.backend.dto.TaskReviewRequest;
import com.eventflow.backend.dto.TaskReviewResponseDTO;
import com.eventflow.backend.dto.TaskWorkUpdateRequest;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping({"/api", "/api/v1"})
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final EventSecurityService eventSecurityService;

    @GetMapping("/events/{eventId}/tasks")
    public ResponseEntity<List<DepartmentTasksDTO>> getEventTasks(
            @PathVariable Long eventId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "deadline") String sort,
            @RequestParam(defaultValue = "asc") String direction,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        if (!eventSecurityService.canAccessEvent(eventId, userId)) {
            return ResponseEntity.status(403).build();
        }
        boolean isLeader = eventSecurityService.isLeaderOfEvent(eventId, userId);
        boolean isMember = eventSecurityService.isMemberOfEvent(eventId, userId);

        return ResponseEntity.ok(taskService.getTasksByEvent(
                eventId,
                status,
                priority,
                departmentId,
                (isLeader || !isMember) ? assigneeId : userId,
                search,
                sort,
                direction,
                isMember && !isLeader));
    }

    @GetMapping("/events/{eventId}/tasks/page")
    public ResponseEntity<PageResponse<TaskResponseDTO>> getEventTaskPage(
            @PathVariable Long eventId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "deadline") String sort,
            @RequestParam(defaultValue = "asc") String direction,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)) {
            return ResponseEntity.status(403).build();
        }
        boolean isLeader = eventSecurityService.isLeaderOfEvent(eventId, userId);

        return ResponseEntity.ok(taskService.getTaskPageByEvent(
                eventId,
                page,
                size,
                sort,
                direction,
                status,
                priority,
                departmentId,
                isLeader ? assigneeId : userId,
                search,
                fromDate,
                toDate,
                !isLeader));
    }

    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<TaskResponseDTO> getTask(
            @PathVariable Long taskId,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!canViewTask(taskId, eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(taskService.getTask(taskId));
    }

    @GetMapping("/tasks/{taskId}/subtasks")
    public ResponseEntity<PageResponse<TaskResponseDTO>> getSubtasks(
            @PathVariable Long taskId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!canViewTask(taskId, eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(taskService.getSubtasks(taskId, page, size));
    }

    @PostMapping("/events/{eventId}/tasks")
    public ResponseEntity<TaskResponseDTO> createTask(
            @PathVariable Long eventId,
            @Valid @RequestBody TaskRequestDTO request,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        if (!eventSecurityService.canManageEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        TaskResponseDTO response = taskService.createTask(eventId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/tasks/{taskId}/subtasks")
    public ResponseEntity<TaskResponseDTO> createSubtask(
            @PathVariable Long taskId,
            @Valid @RequestBody TaskRequestDTO request,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!eventSecurityService.canManageEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        TaskResponseDTO response = taskService.createSubtask(taskId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/tasks/{taskId}")
    public ResponseEntity<TaskResponseDTO> updateTask(
            @PathVariable Long taskId,
            @Valid @RequestBody TaskRequestDTO request,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!eventSecurityService.canManageEvent(eventId, userId)) {
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

        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!canViewTask(taskId, eventId, userId)) {
            return ResponseEntity.status(403).build();
        }

        taskService.updateStatus(taskId, taskService.parseStatus(request.getStatus()));
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/tasks/{taskId}/priority")
    public ResponseEntity<TaskResponseDTO> updateTaskPriority(
            @PathVariable Long taskId,
            @RequestBody PriorityUpdateRequest request,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!eventSecurityService.canManageEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(taskService.updatePriority(taskId, taskService.parsePriority(request.getPriority())));
    }

    @PatchMapping("/tasks/{taskId}/work-update")
    public ResponseEntity<TaskResponseDTO> updateTaskWork(
            @PathVariable Long taskId,
            @Valid @RequestBody TaskWorkUpdateRequest request,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)
                || !eventSecurityService.isTaskAssignee(taskId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(taskService.updateWork(taskId, request));
    }

    @PatchMapping("/tasks/{taskId}/assignment")
    public ResponseEntity<TaskResponseDTO> updateTaskAssignment(
            @PathVariable Long taskId,
            @Valid @RequestBody TaskAssignmentRequest request,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(taskService.updateAssignment(taskId, request));
    }

    @GetMapping("/tasks/{taskId}/reviews")
    public ResponseEntity<List<TaskReviewResponseDTO>> getTaskReviews(
            @PathVariable Long taskId,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!canViewTask(taskId, eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(taskService.getTaskReviews(taskId));
    }

    @PostMapping("/tasks/{taskId}/review")
    public ResponseEntity<TaskResponseDTO> reviewTask(
            @PathVariable Long taskId,
            @Valid @RequestBody TaskReviewRequest request,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        Long eventId = taskService.getEventIdByTaskId(taskId);
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(taskService.reviewTask(taskId, userId, request));
    }

    private boolean canViewTask(Long taskId, Long eventId, Long userId) {
        if (!eventSecurityService.isMemberOfEvent(eventId, userId)) {
            return false;
        }
        return eventSecurityService.isLeaderOfEvent(eventId, userId)
                || eventSecurityService.isTaskAssignee(taskId, userId);
    }
}
