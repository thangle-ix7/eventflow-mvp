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
        if (task == null || task.getAssignee() == null) {
            return;
        }

        User assignee = task.getAssignee();
        String eventName = resolveEventName(task);
        String taskTitle = resolveTaskTitle(task);

        TaskNotification notification = buildTaskNotification(
                assignee,
                task,
                NotiType.TASK_ASSIGNED,
                "Bạn được giao công việc mới",
                "Bạn vừa được giao một công việc mới trong sự kiện " + quote(eventName) + ".\n\n"
                        + "Công việc: " + taskTitle + "\n"
                        + "Deadline: " + formatDateTime(task.getDeadline()) + "\n\n"
                        + "Vui lòng mở EventFlow để xem chi tiết và cập nhật tiến độ đúng hạn.");

        runAfterCommit("task assigned notification for taskId=" + task.getId(), () -> insertTaskNotification(notification));
    }

    public void notifyTaskUpdated(Task task) {
        if (task == null || task.getAssignee() == null) {
            return;
        }

        User assignee = task.getAssignee();
        String taskTitle = resolveTaskTitle(task);

        TaskNotification notification = buildTaskNotification(
                assignee,
                task,
                NotiType.TASK_UPDATED,
                "Công việc vừa được cập nhật",
                "Công việc " + quote(taskTitle) + " vừa có thay đổi mới.\n\n"
                        + "Trạng thái hiện tại: " + formatTaskStatus(task) + "\n"
                        + "Tiến độ: " + formatProgress(task) + "\n"
                        + "Deadline: " + formatDateTime(task.getDeadline()) + "\n\n"
                        + "Vui lòng kiểm tra lại thông tin công việc trên EventFlow.");

        runAfterCommit("task updated notification for taskId=" + task.getId(), () -> insertTaskNotification(notification));
    }

    public void notifyTaskReviewRequested(Task task) {
        if (task == null || task.getEvent() == null) {
            return;
        }

        Long eventId = task.getEvent().getId();
        Long taskId = task.getId();
        String taskTitle = resolveTaskTitle(task);
        String eventName = resolveEventName(task);

        runAfterCommit("task review requested notifications for taskId=" + taskId, () -> {
            List<EventMember> leaders = eventMemberRepository.findByEventIdAndRoleWithUser(eventId, UserRole.LEADER);

            for (EventMember leaderMember : leaders) {
                User leader = leaderMember.getUser();
                if (leader == null) {
                    continue;
                }

                insertTaskNotification(
                        buildTaskNotification(
                                leader,
                                taskId,
                                eventId,
                                NotiType.TASK_REVIEW_REQUESTED,
                                "Có công việc đang chờ duyệt",
                                "Một công việc trong sự kiện " + quote(eventName) + " đã được gửi duyệt.\n\n"
                                        + "Công việc: " + taskTitle + "\n"
                                        + "Trạng thái hiện tại: " + formatTaskStatus(task) + "\n"
                                        + "Tiến độ: " + formatProgress(task) + "\n\n"
                                        + "Vui lòng mở EventFlow để kiểm tra và phản hồi."));
            }
        });
    }

    public void notifyTaskProgressUpdated(Task task, User updater) {
        if (task == null || task.getEvent() == null) {
            return;
        }

        Long eventId = task.getEvent().getId();
        Long taskId = task.getId();
        String taskTitle = resolveTaskTitle(task);
        String eventName = resolveEventName(task);
        Long updaterId = updater != null ? updater.getId() : null;
        String updaterName = updater != null && updater.getName() != null && !updater.getName().isBlank()
                ? updater.getName()
                : "Thành viên";

        String message = updaterName + " vừa cập nhật tiến độ công việc trong sự kiện " + quote(eventName) + ".\n\n"
                + "Công việc: " + taskTitle + "\n"
                + "Trạng thái: " + formatTaskStatus(task) + "\n"
                + "Tiến độ: " + formatProgress(task) + "\n\n"
                + "Vui lòng mở EventFlow để theo dõi thay đổi mới nhất.";

        runAfterCommit("task progress notifications for taskId=" + taskId, () -> {
            List<EventMember> leaders = eventMemberRepository.findByEventIdAndRoleWithUser(eventId, UserRole.LEADER);

            for (EventMember leaderMember : leaders) {
                User leader = leaderMember.getUser();
                if (leader == null) {
                    continue;
                }

                if (updaterId != null && leader.getId() != null && leader.getId().equals(updaterId)) {
                    continue;
                }

                insertTaskNotification(
                        buildTaskNotification(
                                leader,
                                taskId,
                                eventId,
                                NotiType.TASK_UPDATED,
                                "Công việc có cập nhật tiến độ",
                                message));
            }
        });
    }

    public void notifyTaskReviewed(Task task) {
        if (task == null || task.getAssignee() == null) {
            return;
        }

        User assignee = task.getAssignee();
        String taskTitle = resolveTaskTitle(task);

        TaskNotification notification = buildTaskNotification(
                assignee,
                task,
                NotiType.TASK_REVIEWED,
                "Công việc đã được duyệt",
                "Công việc " + quote(taskTitle) + " đã được review.\n\n"
                        + "Trạng thái mới: " + formatTaskStatus(task) + "\n"
                        + "Tiến độ hiện tại: " + formatProgress(task) + "\n\n"
                        + "Bạn có thể mở EventFlow để xem kết quả review và các ghi chú liên quan.");

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

        String calendarTitle = resolveCalendarTitle(title);

        runAfterCommit("calendar created notifications for calendarEventId=" + calendarEventId, () -> notifyCalendarParticipants(
                eventId,
                departmentId,
                attendeeIds,
                calendarEventId,
                creatorId,
                NotiType.CALENDAR_INVITE,
                "Bạn có lịch mới",
                "Bạn được thêm vào một lịch mới trên EventFlow.\n\n"
                        + "Lịch: " + calendarTitle + "\n"
                        + "Thời gian: " + formatDateTimeRange(startTime, endTime) + "\n\n"
                        + "Vui lòng kiểm tra lịch sự kiện để chuẩn bị đúng thời gian."));
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

        String calendarTitle = resolveCalendarTitle(title);

        runAfterCommit("calendar updated notifications for calendarEventId=" + calendarEventId, () -> notifyCalendarParticipants(
                eventId,
                departmentId,
                attendeeIds,
                calendarEventId,
                creatorId,
                NotiType.CALENDAR_UPDATED,
                "Lịch sự kiện vừa được cập nhật",
                "Một lịch bạn tham gia vừa được cập nhật.\n\n"
                        + "Lịch: " + calendarTitle + "\n"
                        + "Thời gian mới: " + formatDateTimeRange(startTime, endTime) + "\n\n"
                        + "Vui lòng mở EventFlow để xem chi tiết lịch mới nhất."));
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
                if (member.getUser() != null && member.getUser().getId() != null) {
                    recipients.put(member.getUser().getId(), member.getUser());
                }
            }
        }

        if (attendeeIds != null && !attendeeIds.isEmpty()) {
            for (EventMember member : eventMemberRepository.findAllByEventIdWithUser(eventId)) {
                if (member.getUser() != null && member.getUser().getId() != null
                        && attendeeIds.contains(member.getUser().getId())) {
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

    private String resolveTaskTitle(Task task) {
        return task.getTitle() != null && !task.getTitle().isBlank()
                ? task.getTitle()
                : "Công việc chưa có tên";
    }

    private String resolveEventName(Task task) {
        if (task.getEvent() != null && task.getEvent().getName() != null && !task.getEvent().getName().isBlank()) {
            return task.getEvent().getName();
        }
        return "sự kiện";
    }

    private String resolveCalendarTitle(String title) {
        return title != null && !title.isBlank()
                ? title
                : "Lịch sự kiện";
    }

    private String formatTaskStatus(Task task) {
        return task.getStatus() != null ? task.getStatus().name() : "Chưa cập nhật";
    }

    private String formatProgress(Task task) {
        int progress = task.getProgressPercentage() != null ? task.getProgressPercentage() : 0;
        return progress + "%";
    }

    private String formatDateTimeRange(LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null && endTime == null) {
            return "chưa có";
        }

        if (startTime != null && endTime != null) {
            return formatDateTime(startTime) + " - " + formatDateTime(endTime);
        }

        return startTime != null ? formatDateTime(startTime) : formatDateTime(endTime);
    }

    private String quote(String value) {
        return "\"" + value + "\"";
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
