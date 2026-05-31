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

        // 1. Get all tasks with assignees that are not DONE
        // We use a custom query in TaskRepository to avoid N+1 and filter assignee IS NOT NULL
        List<Task> tasks = taskRepository.findAllPendingTasksWithAssignees();

        for (Task task : tasks) {
            User assignee = task.getAssignee();
            Long userId = assignee.getId();
            Long taskId = task.getId();
            Long eventId = task.getEvent().getId();

            // Logic for UPCOMING: status != DONE and deadline within 24h
            if (task.getDeadline().isAfter(now) && task.getDeadline().isBefore(twentyFourHoursLater)) {
                String channel = (assignee.getTelegramChatId() != null) ? "TELEGRAM" : "EMAIL";
                notificationRepository.insertIdempotentNotification(
                        userId, taskId, channel, "UPCOMING", "PENDING"
                );
            }

            // Logic for OVERDUE: status != DONE and deadline < now
            if (task.getDeadline().isBefore(now)) {
                // Notify Assignee
                String channel = (assignee.getTelegramChatId() != null) ? "TELEGRAM" : "EMAIL";
                notificationRepository.insertIdempotentNotification(
                        userId, taskId, channel, "OVERDUE", "PENDING"
                );

                // Notify all LEADERs of the event
                List<EventMember> leaders = eventMemberRepository.findByEventIdAndRole(eventId, UserRole.LEADER);
                for (EventMember leaderMember : leaders) {
                    User leader = leaderMember.getUser();
                    String leaderChannel = (leader.getTelegramChatId() != null) ? "TELEGRAM" : "EMAIL";
                    notificationRepository.insertIdempotentNotification(
                            leader.getId(), taskId, leaderChannel, "OVERDUE", "PENDING"
                    );
                }
            }
        }
        log.info("Task reminder scan completed.");
    }
}
