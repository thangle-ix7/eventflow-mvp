package com.eventflow.backend.controller;

import com.eventflow.backend.dto.NotificationCountResponse;
import com.eventflow.backend.dto.NotificationResponse;
import com.eventflow.backend.dto.TelegramLinkTokenResponse;
import com.eventflow.backend.dto.UserProfileDTO;
import com.eventflow.backend.dto.UserProfileUpdateRequest;
import com.eventflow.backend.dto.UserPreferencesRequest;
import jakarta.validation.Valid;
import com.eventflow.backend.repository.NotificationRepository;
import com.eventflow.backend.service.TelegramBotService;
import com.eventflow.backend.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;
import java.util.List;

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

    @PatchMapping("/{userId}")
    public ResponseEntity<UserProfileDTO> updateProfile(
            @PathVariable Long userId,
            @Valid @RequestBody UserProfileUpdateRequest request,
            Authentication authentication) {

        Long authenticatedUserId = (Long) authentication.getPrincipal();
        if (!authenticatedUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(userProfileService.updateProfile(userId, request));
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

        return ResponseEntity.ok(loadRecentNotifications(userId));
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

    @DeleteMapping("/{userId}/telegram-connection")
    public ResponseEntity<Void> disconnectTelegram(
            @PathVariable Long userId,
            Authentication authentication) {

        Long authenticatedUserId = (Long) authentication.getPrincipal();
        if (!authenticatedUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        telegramBotService.disconnectTelegramAccount(userId);
        return ResponseEntity.noContent().build();
    }

    private List<NotificationResponse> loadRecentNotifications(Long userId) {
        return jdbcTemplate.query("""
                SELECT n.id,
                       n.type,
                       n.status,
                       n.channel,
                       n.title,
                       n.message,
                       n.task_id,
                       t.title AS task_title,
                       n.calendar_event_id,
                       ce.start_time AS calendar_start_time,
                       COALESCE(t.event_id, n.event_id, ce.event_id) AS event_id,
                       COALESCE(task_event.name, notification_event.name, calendar_event_owner.name) AS event_name,
                       t.deadline,
                       n.created_at,
                       n.sent_at,
                       n.read_at,
                       n.error_log
                FROM notifications n
                LEFT JOIN tasks t ON t.id = n.task_id
                LEFT JOIN events task_event ON task_event.id = t.event_id
                LEFT JOIN events notification_event ON notification_event.id = n.event_id
                LEFT JOIN calendar_event ce ON ce.id = n.calendar_event_id
                LEFT JOIN events calendar_event_owner ON calendar_event_owner.id = ce.event_id
                WHERE n.user_id = ?
                ORDER BY n.created_at DESC, n.id DESC
                LIMIT 20
                """, (rs, rowNum) -> toNotificationResponse(rs), userId);
    }

    private NotificationResponse toNotificationResponse(ResultSet rs) throws SQLException {
        String type = rs.getString("type");
        String taskTitle = rs.getString("task_title");
        if (taskTitle == null || taskTitle.isBlank()) {
            taskTitle = "Công việc";
        }
        boolean overdue = "OVERDUE".equals(type);
        String fallbackTitle = overdue ? "Task quá hạn" : "Task sắp đến hạn";
        String fallbackMessage = overdue
                ? "Công việc \"" + taskTitle + "\" đã quá hạn. Vui lòng cập nhật trạng thái."
                : "Công việc \"" + taskTitle + "\" sẽ đến hạn trong 24 giờ tới.";

        return NotificationResponse.builder()
                .id(rs.getLong("id"))
                .type(type)
                .status(rs.getString("status"))
                .channel(rs.getString("channel"))
                .title(firstPresent(rs.getString("title"), fallbackTitle))
                .message(firstPresent(rs.getString("message"), fallbackMessage))
                .taskId(getNullableLong(rs, "task_id"))
                .taskTitle(taskTitle)
                .calendarEventId(getNullableLong(rs, "calendar_event_id"))
                .calendarStartTime(getNullableDateTime(rs, "calendar_start_time"))
                .eventId(getNullableLong(rs, "event_id"))
                .eventName(rs.getString("event_name"))
                .deadline(getNullableDateTime(rs, "deadline"))
                .createdAt(getNullableDateTime(rs, "created_at"))
                .sentAt(getNullableDateTime(rs, "sent_at"))
                .readAt(getNullableDateTime(rs, "read_at"))
                .errorLog(rs.getString("error_log"))
                .build();
    }

    private String firstPresent(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private LocalDateTime getNullableDateTime(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value != null ? value.toLocalDateTime() : null;
    }
}
