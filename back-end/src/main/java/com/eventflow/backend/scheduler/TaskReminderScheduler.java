package com.eventflow.backend.scheduler;

import com.eventflow.backend.entity.*;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.NotificationRepository;
import com.eventflow.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class TaskReminderScheduler {

    private final TaskRepository taskRepository;
    private final NotificationRepository notificationRepository;
    private final EventMemberRepository eventMemberRepository;

    @Scheduled(fixedRate = 30 * 60 * 1000) // Every 30 minutes
    @Transactional
    public void scanAndCreateReminders() {
        log.info("Starting task reminder scan at {}", LocalDateTime.now());
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime twentyFourHoursLater = now.plusHours(24);

        List<Task> tasks = taskRepository.findAllPendingTasksForReminders();

        for (Task task : tasks) {
            User assignee = task.getAssignee();
            Long taskId = task.getId();
            Long eventId = task.getEvent().getId();

            if (assignee != null && task.getDeadline().isAfter(now) && task.getDeadline().isBefore(twentyFourHoursLater)) {
                notificationRepository.insertIdempotentNotification(
                        assignee.getId(), taskId, resolveChannel(assignee), "UPCOMING", "PENDING"
                );
            }

            if (task.getDeadline().isBefore(now)) {
                if (assignee != null) {
                    notificationRepository.insertIdempotentNotification(
                            assignee.getId(), taskId, resolveChannel(assignee), "OVERDUE", "PENDING"
                    );
                }

                List<EventMember> leaders = eventMemberRepository.findByEventIdAndRoleWithUser(eventId, UserRole.LEADER);
                for (EventMember leaderMember : leaders) {
                    User leader = leaderMember.getUser();
                    notificationRepository.insertIdempotentNotification(
                            leader.getId(), taskId, resolveChannel(leader), "OVERDUE", "PENDING"
                    );
                }
            }
        }
        log.info("Task reminder scan completed.");
    }

    private String resolveChannel(User user) {
        return user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank() ? "TELEGRAM" : "EMAIL";
    }
}
