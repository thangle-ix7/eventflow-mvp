package com.eventflow.backend.controller;

import com.eventflow.backend.dto.AiCalendarSuggestionResponse;
import com.eventflow.backend.dto.AiDepartmentSuggestionResponse;
import com.eventflow.backend.dto.AiMilestoneSuggestionResponse;
import com.eventflow.backend.dto.AiPlanningSuggestionResponse;
import com.eventflow.backend.dto.AiSubtaskSuggestionResponse;
import com.eventflow.backend.dto.AiSuggestionRequest;
import com.eventflow.backend.dto.AiTaskSuggestionResponse;
import com.eventflow.backend.service.AiSuggestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/ai-suggestions", "/api/v1/ai-suggestions"})
@RequiredArgsConstructor
public class AiSuggestionController {

    private final AiSuggestionService aiSuggestionService;

    @PostMapping("/events/{eventId}/departments")
    public ResponseEntity<AiDepartmentSuggestionResponse> suggestDepartments(
            @PathVariable Long eventId,
            @Valid @RequestBody(required = false) AiSuggestionRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(aiSuggestionService.suggestDepartments(
                eventId,
                currentUserId(authentication),
                request != null ? request : new AiSuggestionRequest()));
    }

    @PostMapping("/events/{eventId}/tasks")
    public ResponseEntity<AiTaskSuggestionResponse> suggestTasks(
            @PathVariable Long eventId,
            @Valid @RequestBody(required = false) AiSuggestionRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(aiSuggestionService.suggestTasks(
                eventId,
                currentUserId(authentication),
                request != null ? request : new AiSuggestionRequest()));
    }

    @PostMapping("/events/{eventId}/planning")
    public ResponseEntity<AiPlanningSuggestionResponse> suggestPlanning(
            @PathVariable Long eventId,
            @Valid @RequestBody(required = false) AiSuggestionRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(aiSuggestionService.suggestPlanning(
                eventId,
                currentUserId(authentication),
                request != null ? request : new AiSuggestionRequest()));
    }

    @PostMapping("/events/{eventId}/milestones")
    public ResponseEntity<AiMilestoneSuggestionResponse> suggestMilestones(
            @PathVariable Long eventId,
            @Valid @RequestBody(required = false) AiSuggestionRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(aiSuggestionService.suggestMilestones(
                eventId,
                currentUserId(authentication),
                request != null ? request : new AiSuggestionRequest()));
    }

    @PostMapping("/events/{eventId}/calendar")
    public ResponseEntity<AiCalendarSuggestionResponse> suggestCalendarItems(
            @PathVariable Long eventId,
            @Valid @RequestBody(required = false) AiSuggestionRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(aiSuggestionService.suggestCalendarItems(
                eventId,
                currentUserId(authentication),
                request != null ? request : new AiSuggestionRequest()));
    }

    @PostMapping("/tasks/{taskId}/subtasks")
    public ResponseEntity<AiSubtaskSuggestionResponse> suggestSubtasks(
            @PathVariable Long taskId,
            @Valid @RequestBody(required = false) AiSuggestionRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(aiSuggestionService.suggestSubtasks(
                taskId,
                currentUserId(authentication),
                request != null ? request : new AiSuggestionRequest()));
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
