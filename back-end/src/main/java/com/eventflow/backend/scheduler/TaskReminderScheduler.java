package com.eventflow.backend.scheduler;

import com.eventflow.backend.entity.*;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.NotificationRepository;
import com.eventflow.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
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
    private final JdbcTemplate jdbcTemplate;

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
                notificationRepository.insertTaskNotification(
                        assignee.getId(), taskId, resolveChannel(assignee), "UPCOMING", "PENDING"
                );
            }

            if (task.getDeadline().isBefore(now)) {
                if (assignee != null) {
                    notificationRepository.insertTaskNotification(
                            assignee.getId(), taskId, resolveChannel(assignee), "OVERDUE", "PENDING"
                    );
                }

                List<EventMember> leaders = eventMemberRepository.findByEventIdAndRoleWithUser(eventId, UserRole.LEADER);
                for (EventMember leaderMember : leaders) {
                    User leader = leaderMember.getUser();
                    notificationRepository.insertTaskNotification(
                            leader.getId(), taskId, resolveChannel(leader), "OVERDUE", "PENDING"
                    );
                }
            }
        }
        createCalendarReminders(now);
        log.info("Task reminder scan completed.");
    }

    private void createCalendarReminders(LocalDateTime now) {
        createCalendarRemindersForWindow(
                now.plusHours(24),
                now.plusHours(24).plusMinutes(30),
                NotiType.CALENDAR_REMINDER_TOMORROW,
                "Ngày mai có lịch trong sự kiện",
                "Ngày mai bạn có lịch \"%s\" lúc %s.");
        createCalendarRemindersForWindow(
                now,
                now.plusMinutes(30),
                NotiType.CALENDAR_REMINDER_SOON,
                "Lịch sắp bắt đầu",
                "Khoảng 30 phút nữa bạn có lịch \"%s\" lúc %s.");
    }

    private void createCalendarRemindersForWindow(
            LocalDateTime from,
            LocalDateTime to,
            NotiType type,
            String title,
            String messageTemplate) {

        List<CalendarReminderTarget> calendarItems = jdbcTemplate.query("""
                SELECT ce.id,
                       ce.event_id,
                       ce.department_id,
                       ce.title,
                       ce.start_time
                FROM calendar_event ce
                WHERE ce.deleted_at IS NULL
                  AND ce.start_time > ?
                  AND ce.start_time <= ?
                  AND COALESCE(ce.status, 'SCHEDULED') <> 'CANCELLED'
                ORDER BY ce.start_time ASC
                """, (rs, rowNum) -> new CalendarReminderTarget(
                rs.getLong("id"),
                rs.getLong("event_id"),
                rs.getObject("department_id", Long.class),
                rs.getString("title"),
                rs.getTimestamp("start_time").toLocalDateTime()), from, to);

        for (CalendarReminderTarget calendarItem : calendarItems) {
            List<User> recipients = resolveCalendarReminderRecipients(calendarItem);
            String message = String.format(messageTemplate, calendarItem.title(), formatReminderTime(calendarItem.startTime()));
            for (User recipient : recipients) {
                notificationRepository.insertWorkflowNotification(
                        recipient.getId(),
                        null,
                        calendarItem.eventId(),
                        calendarItem.id(),
                        resolveChannel(recipient),
                        type.name(),
                        NotiStatus.PENDING.name(),
                        title,
                        message);
            }
        }
    }

    private List<User> resolveCalendarReminderRecipients(CalendarReminderTarget calendarItem) {
        List<Long> attendeeIds = jdbcTemplate.query("""
                SELECT user_id
                FROM calendar_event_attendees
                WHERE calendar_event_id = ?
                """, (rs, rowNum) -> rs.getLong("user_id"), calendarItem.id());

        java.util.Map<Long, User> recipients = new java.util.LinkedHashMap<>();
        if (calendarItem.departmentId() != null) {
            for (EventMember member : eventMemberRepository.findAllByEventIdAndDepartmentIdWithUser(
                    calendarItem.eventId(),
                    calendarItem.departmentId())) {
                recipients.put(member.getUser().getId(), member.getUser());
            }
        }

        if (!attendeeIds.isEmpty()) {
            for (EventMember member : eventMemberRepository.findAllByEventIdWithUser(calendarItem.eventId())) {
                if (attendeeIds.contains(member.getUser().getId())) {
                    recipients.put(member.getUser().getId(), member.getUser());
                }
            }
        }

        if (calendarItem.departmentId() == null && attendeeIds.isEmpty()) {
            for (EventMember member : eventMemberRepository.findAllByEventIdWithUser(calendarItem.eventId())) {
                recipients.put(member.getUser().getId(), member.getUser());
            }
        }

        return List.copyOf(recipients.values());
    }

    private String resolveChannel(User user) {
        return user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank() ? "TELEGRAM" : "EMAIL";
    }

    private String formatReminderTime(LocalDateTime value) {
        return value != null ? value.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "chưa có giờ";
    }

    private record CalendarReminderTarget(
            Long id,
            Long eventId,
            Long departmentId,
            String title,
            LocalDateTime startTime) {
    }
}
