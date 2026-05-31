package com.eventflow.backend.security;

import com.eventflow.backend.entity.UserRole;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EventSecurityService {

    private final EventMemberRepository eventMemberRepository;
    private final TaskRepository taskRepository;

    /**
     * Check if a user has a specific role in an event.
     * Role is NOT stored in JWT - it is looked up dynamically from event_members table.
     * Uses a COUNT query to avoid LazyInitializationException on User entity.
     */
    public boolean hasRoleInEvent(Long eventId, Long userId, String requiredRole) {
        if (eventId == null || userId == null || requiredRole == null) {
            return false;
        }

        UserRole role = UserRole.valueOf(requiredRole.toUpperCase());
        return eventMemberRepository.existsByEventIdAndUserIdAndRole(eventId, userId, role);
    }

    /**
     * Check if a user is the assignee of a specific task.
     * Uses a direct COUNT query to avoid loading the full Task entity.
     */
    public boolean isTaskAssignee(Long taskId, Long userId) {
        if (taskId == null || userId == null) {
            return false;
        }
        return taskRepository.existsByIdAndAssigneeId(taskId, userId);
    }
}
