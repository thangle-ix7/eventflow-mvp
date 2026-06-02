package com.eventflow.backend.controller;

import com.eventflow.backend.dto.NotificationCountResponse;
import com.eventflow.backend.dto.NotificationResponse;
import com.eventflow.backend.dto.TelegramLinkTokenResponse;
import com.eventflow.backend.dto.UserProfileDTO;
import com.eventflow.backend.dto.UserPreferencesRequest;
import com.eventflow.backend.entity.Notification;
import jakarta.validation.Valid;
import com.eventflow.backend.repository.NotificationRepository;
import com.eventflow.backend.service.TelegramBotService;
import com.eventflow.backend.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.concurrent.TimeUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/users", "/api/v1/users"})
@RequiredArgsConstructor
public class UserController {

    private final TelegramBotService telegramBotService;
    private final UserProfileService userProfileService;
    private final NotificationRepository notificationRepository;
    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/{userId}")
    public ResponseEntity<UserProfileDTO> getProfile(
            @PathVariable Long userId,
            Authentication authentication) {

        Long authenticatedUserId = (Long) authentication.getPrincipal();
        if (!authenticatedUserId.equals(userId)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(userProfileService.getProfile(userId));
    }

    @PatchMapping("/{userId}/preferences")
    public ResponseEntity<UserProfileDTO> updatePreferences(
            @PathVariable Long userId,
            @Valid @RequestBody UserPreferencesRequest request,
            Authentication authentication) {

        Long authenticatedUserId = (Long) authentication.getPrincipal();
        if (!authenticatedUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(userProfileService.updatePreferences(userId, request));
    }

    @PostMapping(value = "/{userId}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserProfileDTO> uploadAvatar(
            @PathVariable Long userId,
            @RequestPart MultipartFile avatar,
            Authentication authentication) {

        Long authenticatedUserId = (Long) authentication.getPrincipal();
        if (!authenticatedUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(userProfileService.uploadAvatar(userId, avatar));
    }

    @GetMapping("/{userId}/avatar")
    public ResponseEntity<?> getAvatar(
            @PathVariable Long userId,
            Authentication authentication) {

        Long authenticatedUserId = (Long) authentication.getPrincipal();
        if (!authenticatedUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        var avatar = userProfileService.getAvatar(userId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(10, TimeUnit.MINUTES).cachePrivate())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + avatar.originalName() + "\"")
                .contentType(MediaType.parseMediaType(avatar.contentType()))
                .contentLength(avatar.sizeBytes())
                .body(avatar.resource());
    }

    @GetMapping("/{userId}/notifications/pending-count")
    public ResponseEntity<NotificationCountResponse> getPendingNotificationCount(
            @PathVariable Long userId,
            Authentication authentication) {

        Long authenticatedUserId = (Long) authentication.getPrincipal();
        if (!authenticatedUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        long pendingCount = notificationRepository.countByUserIdAndReadAtIsNull(userId);
        return ResponseEntity.ok(new NotificationCountResponse(pendingCount));
    }

    @GetMapping("/{userId}/notifications")
    public ResponseEntity<List<NotificationResponse>> getNotifications(
            @PathVariable Long userId,
            Authentication authentication) {

        Long authenticatedUserId = (Long) authentication.getPrincipal();
        if (!authenticatedUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<Notification> notifications = notificationRepository
                .findRecentByUserIdWithDetails(userId, PageRequest.of(0, 20));
        Map<Long, CalendarNotificationContext> calendarContextById = loadCalendarContext(notifications);

        List<NotificationResponse> responses = notifications.stream()
                .map(notification -> toNotificationResponse(notification, calendarContextById.get(notification.getCalendarEventId())))
                .toList();
        return ResponseEntity.ok(responses);
    }

    @PatchMapping("/{userId}/notifications/{notificationId}/read")
    public ResponseEntity<Void> markNotificationAsRead(
            @PathVariable Long userId,
            @PathVariable Long notificationId,
            Authentication authentication) {

        Long authenticatedUserId = (Long) authentication.getPrincipal();
        if (!authenticatedUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        notificationRepository.markAsRead(userId, notificationId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{userId}/notifications/read-all")
    public ResponseEntity<Void> markAllNotificationsAsRead(
            @PathVariable Long userId,
            Authentication authentication) {

        Long authenticatedUserId = (Long) authentication.getPrincipal();
        if (!authenticatedUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        notificationRepository.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{userId}/telegram-link-token")
    public ResponseEntity<TelegramLinkTokenResponse> createTelegramLinkToken(
            @PathVariable Long userId,
            Authentication authentication) {

        Long authenticatedUserId = (Long) authentication.getPrincipal();
        if (!authenticatedUserId.equals(userId)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(telegramBotService.createLinkToken(userId));
    }

    private NotificationResponse toNotificationResponse(Notification notification, CalendarNotificationContext calendarContext) {
        var task = notification.getTask();
        var event = task != null ? task.getEvent() : null;
        boolean overdue = notification.getType() != null && notification.getType().name().equals("OVERDUE");
        String taskTitle = task != null ? task.getTitle() : "Công việc";
        String fallbackTitle = overdue ? "Task quá hạn" : "Task sắp đến hạn";
        String fallbackMessage = overdue
                ? "Công việc \"" + taskTitle + "\" đã quá hạn. Vui lòng cập nhật trạng thái."
                : "Công việc \"" + taskTitle + "\" sẽ đến hạn trong 24 giờ tới.";

        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType() != null ? notification.getType().name() : null)
                .status(notification.getStatus() != null ? notification.getStatus().name() : null)
                .channel(notification.getChannel() != null ? notification.getChannel().name() : null)
                .title(notification.getTitle() != null ? notification.getTitle() : fallbackTitle)
                .message(notification.getMessage() != null ? notification.getMessage() : fallbackMessage)
                .taskId(task != null ? task.getId() : null)
                .taskTitle(taskTitle)
                .calendarEventId(notification.getCalendarEventId())
                .calendarStartTime(calendarContext != null ? calendarContext.startTime() : null)
                .eventId(event != null
                        ? event.getId()
                        : (notification.getEventId() != null
                                ? notification.getEventId()
                                : (calendarContext != null ? calendarContext.eventId() : null)))
                .eventName(event != null ? event.getName() : (calendarContext != null ? calendarContext.eventName() : null))
                .deadline(task != null ? task.getDeadline() : null)
                .createdAt(notification.getCreatedAt())
                .sentAt(notification.getSentAt())
                .readAt(notification.getReadAt())
                .errorLog(notification.getErrorLog())
                .build();
    }

    private Map<Long, CalendarNotificationContext> loadCalendarContext(List<Notification> notifications) {
        List<Long> calendarEventIds = notifications.stream()
                .map(Notification::getCalendarEventId)
                .filter(id -> id != null)
                .distinct()
                .toList();

        if (calendarEventIds.isEmpty()) {
            return Map.of();
        }

        String placeholders = calendarEventIds.stream().map(id -> "?").collect(Collectors.joining(","));
        return jdbcTemplate.query("""
                SELECT ce.id, ce.event_id, ce.start_time, e.name AS event_name
                FROM calendar_event ce
                JOIN events e ON e.id = ce.event_id
                WHERE ce.id IN (%s)
                """.formatted(placeholders), rs -> {
            Map<Long, CalendarNotificationContext> contexts = new java.util.HashMap<>();
            while (rs.next()) {
                contexts.put(
                        rs.getLong("id"),
                        new CalendarNotificationContext(
                                rs.getLong("event_id"),
                                rs.getTimestamp("start_time").toLocalDateTime(),
                                rs.getString("event_name")));
            }
            return contexts;
        }, calendarEventIds.toArray());
    }

    private record CalendarNotificationContext(Long eventId, java.time.LocalDateTime startTime, String eventName) {
    }
}
