package com.eventflow.backend.service;

import com.eventflow.backend.entity.EventMember;
import com.eventflow.backend.entity.NotiChannel;
import com.eventflow.backend.entity.NotiStatus;
import com.eventflow.backend.entity.NotiType;
import com.eventflow.backend.entity.Task;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.entity.UserRole;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationWorkflowService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final NotificationRepository notificationRepository;
    private final EventMemberRepository eventMemberRepository;

    public void notifyTaskAssigned(Task task) {
        User assignee = task.getAssignee();
        if (assignee == null) {
            return;
        }

        String eventName = task.getEvent() != null ? task.getEvent().getName() : "sự kiện";
        TaskNotification notification = buildTaskNotification(
                assignee,
                task,
                NotiType.TASK_ASSIGNED,
                "Bạn được giao công việc mới",
                "Bạn được giao công việc \"" + task.getTitle() + "\" trong " + eventName
                        + ". Deadline: " + formatDateTime(task.getDeadline()) + ".");
        runAfterCommit("task assigned notification for taskId=" + task.getId(), () -> insertTaskNotification(notification));
    }

    public void notifyTaskUpdated(Task task) {
        User assignee = task.getAssignee();
        if (assignee == null) {
            return;
        }

        TaskNotification notification = buildTaskNotification(
                assignee,
                task,
                NotiType.TASK_UPDATED,
                "Công việc được cập nhật",
                "Công việc \"" + task.getTitle() + "\" vừa được cập nhật. Deadline hiện tại: "
                        + formatDateTime(task.getDeadline()) + ".");
        runAfterCommit("task updated notification for taskId=" + task.getId(), () -> insertTaskNotification(notification));
    }

    public void notifyTaskReviewRequested(Task task) {
        if (task.getEvent() == null) {
            return;
        }

        Long eventId = task.getEvent().getId();
        Long taskId = task.getId();
        String taskTitle = task.getTitle();
        runAfterCommit("task review requested notifications for taskId=" + taskId, () -> {
            List<EventMember> leaders = eventMemberRepository.findByEventIdAndRoleWithUser(eventId, UserRole.LEADER);
            for (EventMember leaderMember : leaders) {
                insertTaskNotification(
                        buildTaskNotification(
                                leaderMember.getUser(),
                                taskId,
                                eventId,
                                NotiType.TASK_REVIEW_REQUESTED,
                                "Công việc cần duyệt",
                                "Công việc \"" + taskTitle + "\" đã được gửi duyệt."));
            }
        });
    }

    public void notifyTaskProgressUpdated(Task task, User updater) {
        if (task.getEvent() == null) {
            return;
        }

        Long eventId = task.getEvent().getId();
        Long taskId = task.getId();
        String taskTitle = task.getTitle();
        String status = task.getStatus().name();
        Integer progress = task.getProgressPercentage() != null ? task.getProgressPercentage() : 0;
        Long updaterId = updater != null ? updater.getId() : null;
        String updaterName = updater != null ? updater.getName() : "Thành viên";
        String message = updaterName + " vừa cập nhật công việc \"" + taskTitle
                + "\". Trạng thái: " + status
                + ", tiến độ: " + progress + "%.";

        runAfterCommit("task progress notifications for taskId=" + taskId, () -> {
            List<EventMember> leaders = eventMemberRepository.findByEventIdAndRoleWithUser(eventId, UserRole.LEADER);
            for (EventMember leaderMember : leaders) {
                User leader = leaderMember.getUser();
                if (updaterId != null && leader.getId().equals(updaterId)) {
                    continue;
                }
                insertTaskNotification(
                        buildTaskNotification(
                                leader,
                                taskId,
                                eventId,
                                NotiType.TASK_UPDATED,
                                "Công việc có cập nhật mới",
                                message));
            }
        });
    }

    public void notifyTaskReviewed(Task task) {
        User assignee = task.getAssignee();
        if (assignee == null) {
            return;
        }

        TaskNotification notification = buildTaskNotification(
                assignee,
                task,
                NotiType.TASK_REVIEWED,
                "Công việc đã được duyệt",
                "Công việc \"" + task.getTitle() + "\" đã được review. Trạng thái mới: "
                        + task.getStatus().name() + ".");
        runAfterCommit("task reviewed notification for taskId=" + task.getId(), () -> insertTaskNotification(notification));
    }

    public void notifyCalendarCreated(
            Long eventId,
            Long departmentId,
            List<Long> attendeeIds,
            Long calendarEventId,
            Long creatorId,
            String title,
            LocalDateTime startTime,
            LocalDateTime endTime) {

        runAfterCommit("calendar created notifications for calendarEventId=" + calendarEventId, () -> notifyCalendarParticipants(
                eventId,
                departmentId,
                attendeeIds,
                calendarEventId,
                creatorId,
                NotiType.CALENDAR_INVITE,
                "Lịch họp mới",
                "Bạn có lịch \"" + title + "\" từ " + formatDateTime(startTime)
                        + " đến " + formatDateTime(endTime) + "."));
    }

    public void notifyCalendarUpdated(
            Long eventId,
            Long departmentId,
            List<Long> attendeeIds,
            Long calendarEventId,
            Long creatorId,
            String title,
            LocalDateTime startTime,
            LocalDateTime endTime) {

        runAfterCommit("calendar updated notifications for calendarEventId=" + calendarEventId, () -> notifyCalendarParticipants(
                eventId,
                departmentId,
                attendeeIds,
                calendarEventId,
                creatorId,
                NotiType.CALENDAR_UPDATED,
                "Lịch họp được cập nhật",
                "Lịch \"" + title + "\" vừa được cập nhật: " + formatDateTime(startTime)
                        + " đến " + formatDateTime(endTime) + "."));
    }

    private void notifyCalendarParticipants(
            Long eventId,
            Long departmentId,
            List<Long> attendeeIds,
            Long calendarEventId,
            Long creatorId,
            NotiType type,
            String title,
            String message) {

        Map<Long, User> recipients = new LinkedHashMap<>();
        if (departmentId != null) {
            for (EventMember member : eventMemberRepository.findAllByEventIdAndDepartmentIdWithUser(eventId, departmentId)) {
                recipients.put(member.getUser().getId(), member.getUser());
            }
        }

        if (attendeeIds != null && !attendeeIds.isEmpty()) {
            for (EventMember member : eventMemberRepository.findAllByEventIdWithUser(eventId)) {
                if (attendeeIds.contains(member.getUser().getId())) {
                    recipients.put(member.getUser().getId(), member.getUser());
                }
            }
        }

        recipients.remove(creatorId);
        for (User user : recipients.values()) {
            notificationRepository.insertWorkflowNotification(
                    user.getId(),
                    null,
                    eventId,
                    calendarEventId,
                    resolveChannel(user).name(),
                    type.name(),
                    NotiStatus.PENDING.name(),
                    title,
                    message);
        }
    }

    private TaskNotification buildTaskNotification(User user, Task task, NotiType type, String title, String message) {
        return buildTaskNotification(
                user,
                task.getId(),
                task.getEvent() != null ? task.getEvent().getId() : null,
                type,
                title,
                message);
    }

    private TaskNotification buildTaskNotification(
            User user,
            Long taskId,
            Long eventId,
            NotiType type,
            String title,
            String message) {

        return new TaskNotification(
                user.getId(),
                taskId,
                eventId,
                resolveChannel(user).name(),
                type,
                title,
                message);
    }

    private void insertTaskNotification(TaskNotification notification) {
        notificationRepository.insertWorkflowNotification(
                notification.userId(),
                notification.taskId(),
                notification.eventId(),
                null,
                notification.channel(),
                notification.type().name(),
                NotiStatus.PENDING.name(),
                notification.title(),
                notification.message());
    }

    private void runAfterCommit(String operation, Runnable action) {
        Runnable guardedAction = () -> {
            try {
                action.run();
            } catch (DataIntegrityViolationException ex) {
                log.warn("Skipped {} because notification data violated a database constraint: {}", operation, rootMessage(ex));
            } catch (RuntimeException ex) {
                log.warn("Skipped {} because notification workflow failed: {}", operation, rootMessage(ex), ex);
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()
                && TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    guardedAction.run();
                }
            });
            return;
        }

        guardedAction.run();
    }

    private String rootMessage(Throwable throwable) {
        Throwable current = throwable;
        while (current.getCause() != null) {
            current = current.getCause();
        }
        return current.getMessage();
    }

    private NotiChannel resolveChannel(User user) {
        return user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank()
                ? NotiChannel.TELEGRAM
                : NotiChannel.EMAIL;
    }

    private String formatDateTime(LocalDateTime value) {
        return value != null ? value.format(DATE_TIME_FORMATTER) : "chưa có";
    }

    private record TaskNotification(
            Long userId,
            Long taskId,
            Long eventId,
            String channel,
            NotiType type,
            String title,
            String message) {
    }
}
