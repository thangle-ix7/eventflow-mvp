package com.eventflow.backend.security;

import com.eventflow.backend.entity.EventNature;
import com.eventflow.backend.entity.UserRole;
import com.eventflow.backend.repository.DepartmentRepository;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EventSecurityService {

    private final EventMemberRepository eventMemberRepository;
    private final TaskRepository taskRepository;
    private final EventRepository eventRepository;
    private final AdminSecurityService adminSecurityService;
    private final DepartmentRepository departmentRepository;

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

    public boolean isMemberOfEvent(Long eventId, Long userId) {
        if (eventId == null || userId == null) {
            return false;
        }
        return eventMemberRepository.existsByEventIdAndUserId(eventId, userId);
    }

    public boolean isLeaderOfEvent(Long eventId, Long userId) {
        if (adminSecurityService.canManageTemplates(userId)) {
            return true;
        }
        return hasRoleInEvent(eventId, userId, UserRole.LEADER.name());
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

    /**
     * Check user có phải Department Leader của department trong event hay không.
     * Department Leader được xác định bằng departments.leader_user_id.
     */
    public boolean isDepartmentLeader(Long eventId, Long departmentId, Long userId) {
        if (eventId == null || departmentId == null || userId == null) {
            return false;
        }
        return departmentRepository.existsDepartmentLeader(eventId, departmentId, userId);
    }

    /**
     * Kiểm tra user có quyền quản lý event/template không
     * - Nếu là template: ADMIN có thể quản lý
     * - Nếu là event: LEADER có thể quản lý
     */
    public boolean canManageEvent(Long eventId, Long userId) {
        if (eventId == null || userId == null) {
            return false;
        }

        return eventRepository.findById(eventId)
                .map(event -> {
                    if (event.getNature() == EventNature.TEMPLATE) {
                        // Template: chỉ ADMIN mới quản lý được
                        return adminSecurityService.isAdmin(userId);
                    } else {
                        // Event thường: LEADER quản lý
                        return isLeaderOfEvent(eventId, userId);
                    }
                })
                .orElse(false);
    }

    /**
     * Kiểm tra user có quyền truy cập event/template không
     * - Template: tất cả đều truy cập được
     * - Event: phải là member
     */
    public boolean canAccessEvent(Long eventId, Long userId) {
        if (eventId == null || userId == null) {
            return false;
        }

        return eventRepository.findById(eventId)
                .map(event -> {
                    if (event.getNature() == EventNature.TEMPLATE) {
                        // Template: public cho tất cả
                        return true;
                    } else {
                        // Event thường: phải là member
                        return isMemberOfEvent(eventId, userId);
                    }
                })
                .orElse(false);
    }
}
