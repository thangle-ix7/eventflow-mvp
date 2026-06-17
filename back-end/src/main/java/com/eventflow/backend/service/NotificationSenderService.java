package com.eventflow.backend.service;

import com.eventflow.backend.entity.Notification;
import com.eventflow.backend.entity.NotiChannel;
import com.eventflow.backend.entity.NotiStatus;
import com.eventflow.backend.entity.Task;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.mail.internet.MimeMessage;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationSenderService {
    private static final Pattern URL_ENCODED_SEQUENCE = Pattern.compile("%[0-9A-Fa-f]{2}");

    private final NotificationRepository notificationRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final JavaMailSender javaMailSender;

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${spring.mail.from:noreply@eventflow.com}")
    private String fromEmail;

    @Value("${eventflow.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public void processNotification(Notification notification) {
        User user = notification.getUser();
        Task task = notification.getTask();
        NotiChannel channel = notification.getChannel();

        String message = buildMessage(notification, user, task);

        boolean sent = false;

        if (channel == NotiChannel.TELEGRAM && user.getTelegramChatId() != null) {
            sent = sendTelegram(user.getTelegramChatId(), message);
        } else {
            sent = sendEmail(user.getEmail(), notification, user, task, message);
        }

        if (sent) {
            notificationRepository.markAsSent(notification.getId());
            log.info("Notification [id={}] sent successfully via {}", notification.getId(), channel);
        } else {
            handleFailure(notification, "Failed to send notification via " + channel);
        }
    }

    private boolean sendTelegram(String chatId, String text) {
        try {
            String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
            Map<String, Object> body = new HashMap<>();
            body.put("chat_id", chatId);
            body.put("text", text);

            Map<String, Object> response = restTemplate.postForObject(url, jsonEntity(body), Map.class);
            return response != null && Boolean.TRUE.equals(response.get("ok"));
        } catch (RestClientException e) {
            log.error("Telegram send failed for chatId={}: {}", chatId, e.getMessage());
            return false;
        }
    }

    private boolean sendEmail(String toEmail, Notification notification, User user, Task task, String text) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name());
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(resolveEmailSubject(notification));
            helper.setText(text, buildNotificationHtml(notification, user, task, text));
            javaMailSender.send(message);
            return true;
        } catch (Exception e) {
            log.error("Email send failed to {}: {}", toEmail, e.getMessage());
            return false;
        }
    }

    private void handleFailure(Notification notification, String errorMessage) {
        int updated = notificationRepository.incrementRetryAndFallback(notification.getId(), errorMessage);

        if (updated > 0) {
            // Reload to check new retry count
            Notification reloaded = notificationRepository.findById(notification.getId()).orElse(null);
            if (reloaded != null && reloaded.getRetryCount() >= 3) {
                notificationRepository.markAsFailed(notification.getId());
                log.warn("Notification [id={}] marked as FAILED after {} retries", notification.getId(), reloaded.getRetryCount());
            } else {
                log.warn("Notification [id={}] retry incremented. error: {}", notification.getId(), errorMessage);
            }
        }
    }

    private String buildMessage(Notification notification, User user, Task task) {
        if (notification.getMessage() != null && !notification.getMessage().isBlank()) {
            return decodeLegacyUrlEncodedMessage(notification.getMessage());
        }

        String userName = user != null ? user.getName() : "Người dùng";
        String taskTitle = task != null ? task.getTitle() : "N/A";

        return switch (notification.getType()) {
            case UPCOMING ->
                    "Xin chào " + userName + ",\n\n" +
                            "Công việc \"" + taskTitle + "\" của bạn sẽ đến hạn trong 24 giờ tới.\n" +
                            "Hãy hoàn thành đúng hạn nhé!\n\n" +
                            "EventFlow - Hệ thống quản lý sự kiện.";
            case OVERDUE ->
                    "Xin chào " + userName + ",\n\n" +
                            "Công việc \"" + taskTitle + "\" của bạn ĐÃ QUÁ HẠN!\n" +
                            "Vui lòng cập nhật trạng thái ngay.\n\n" +
                            "EventFlow - Hệ thống quản lý sự kiện.";
            case TASK_ASSIGNED, TASK_UPDATED, TASK_REVIEW_REQUESTED, TASK_REVIEWED,
                 CALENDAR_INVITE, CALENDAR_UPDATED, CALENDAR_REMINDER_TOMORROW, CALENDAR_REMINDER_SOON,
                 FEEDBACK_REVIEWING, FEEDBACK_RESPONDED, FEEDBACK_CLOSED ->
                    notification.getTitle() != null ? notification.getTitle() : "Bạn có thông báo mới từ EventFlow.";
        };
    }

    private String decodeLegacyUrlEncodedMessage(String message) {
        if (message == null || !URL_ENCODED_SEQUENCE.matcher(message).find()) {
            return message;
        }

        String current = message;
        try {
            for (int i = 0; i < 3 && URL_ENCODED_SEQUENCE.matcher(current).find(); i++) {
                String decoded = URLDecoder.decode(current, StandardCharsets.UTF_8);
                if (decoded.equals(current) || decoded.isBlank()) {
                    break;
                }
                current = decoded;
            }
            return current.isBlank() ? message : current;
        } catch (IllegalArgumentException e) {
            return message;
        }
    }

    private String resolveEmailSubject(Notification notification) {
        String title = notification.getTitle();
        if (title != null && !title.isBlank()) {
            return "[EventFlow] " + title;
        }

        return switch (notification.getType()) {
            case OVERDUE -> "[EventFlow] Công việc đã quá hạn";
            case UPCOMING -> "[EventFlow] Công việc sắp đến hạn";
            case TASK_ASSIGNED -> "[EventFlow] Bạn được giao công việc mới";
            case TASK_UPDATED -> "[EventFlow] Công việc vừa được cập nhật";
            case TASK_REVIEW_REQUESTED -> "[EventFlow] Cần duyệt công việc";
            case TASK_REVIEWED -> "[EventFlow] Công việc đã được duyệt";
            case CALENDAR_INVITE -> "[EventFlow] Bạn có lịch mới";
            case CALENDAR_UPDATED -> "[EventFlow] Lịch sự kiện vừa được cập nhật";
            case CALENDAR_REMINDER_TOMORROW -> "[EventFlow] Nhắc lịch ngày mai";
            case CALENDAR_REMINDER_SOON -> "[EventFlow] Nhắc lịch sắp diễn ra";
            case FEEDBACK_REVIEWING -> "[EventFlow] Feedback của bạn đang được xem";
            case FEEDBACK_RESPONDED -> "[EventFlow] EventFlow đã phản hồi feedback của bạn";
            case FEEDBACK_CLOSED -> "[EventFlow] Feedback của bạn đã được đóng";
        };
    }

    private String buildNotificationHtml(Notification notification, User user, Task task, String text) {
        String userName = user != null ? user.getName() : "bạn";
        String heading = notification.getTitle() != null && !notification.getTitle().isBlank()
                ? notification.getTitle()
                : "Bạn có thông báo mới từ EventFlow";
        String taskTitle = task != null ? task.getTitle() : null;
        String actionUrl = buildNotificationUrl(notification, task);
        String badgeLabel = resolveEmailBadgeLabel(notification);
        String actionLabel = resolveEmailActionLabel(notification, task);
        String accentColor = resolveEmailAccentColor(notification);
        String accentSoftColor = resolveEmailAccentSoftColor(notification);
        String plainText = text == null || text.isBlank()
                ? "Bạn có một cập nhật mới trong hệ thống EventFlow."
                : text;

        String cta = actionUrl == null ? "" : """
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:26px;">
                  <tr>
                    <td style="border-radius:16px;background:linear-gradient(135deg,#0ea5e9 0%%,#06b6d4 48%%,#10b981 100%%);box-shadow:0 14px 26px rgba(14,165,233,0.24);">
                      <a href="%s" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;border-radius:16px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:900;letter-spacing:-0.01em;">%s</a>
                    </td>
                  </tr>
                </table>
                """.formatted(escape(actionUrl), escape(actionLabel));

        String fallbackLink = actionUrl == null ? "" : """
                <div style="margin-top:18px;padding:14px 16px;border:1px solid #e0f2fe;border-radius:16px;background:#f8fcff;">
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">Nếu nút không mở được, bạn có thể dùng đường dẫn sau:</p>
                  <p style="margin:8px 0 0;word-break:break-all;font-size:12px;line-height:1.6;">
                    <a href="%s" target="_blank" rel="noopener noreferrer" style="color:#0284c7;text-decoration:underline;font-weight:700;">%s</a>
                  </p>
                </div>
                """.formatted(escape(actionUrl), escape(actionUrl));

        String taskBlock = taskTitle == null ? "" : """
                <div style="margin-top:20px;border:1px solid #dbeafe;border-radius:20px;background:linear-gradient(135deg,#f8fcff 0%%,#ecfeff 55%%,#f0fdf4 100%%);overflow:hidden;">
                  <div style="padding:16px 18px;border-bottom:1px solid #e0f2fe;">
                    <div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;color:#0284c7;">Thông tin công việc</div>
                    <div style="margin-top:8px;font-size:17px;font-weight:900;line-height:1.4;color:#0f172a;">%s</div>
                  </div>
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="width:50%%;padding:14px 18px;border-right:1px solid #e0f2fe;">
                        <div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Deadline</div>
                        <div style="margin-top:6px;font-size:14px;font-weight:800;color:#334155;">%s</div>
                      </td>
                      <td style="width:50%%;padding:14px 18px;">
                        <div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Trạng thái</div>
                        <div style="margin-top:6px;font-size:14px;font-weight:800;color:#334155;">%s</div>
                      </td>
                    </tr>
                  </table>
                </div>
                """.formatted(
                escape(taskTitle),
                escape(task.getDeadline() != null ? task.getDeadline().toString().replace('T', ' ') : "Chưa có"),
                escape(task.getStatus() != null ? task.getStatus().name() : "Chưa cập nhật")
        );

        return """
                <!doctype html>
                <html lang="vi">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>EventFlow Notification</title>
                  </head>
                  <body style="margin:0;padding:0;background:#f8fcff;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
                    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
                      %s
                    </div>

                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f8fcff;padding:28px 12px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:620px;border-collapse:separate;border-spacing:0;">
                            <tr>
                              <td style="padding:0 0 14px;">
                                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="vertical-align:middle;">
                                      <div style="display:inline-block;height:44px;width:44px;border-radius:18px;background:linear-gradient(135deg,#38bdf8 0%%,#10b981 100%%);box-shadow:0 12px 24px rgba(14,165,233,0.22);vertical-align:middle;"></div>
                                      <span style="display:inline-block;margin-left:10px;vertical-align:middle;font-size:22px;font-weight:950;letter-spacing:-0.04em;color:#0f172a;">
                                        Event<span style="color:#0ea5e9;">Flow</span>
                                      </span>
                                    </td>
                                    <td align="right" style="vertical-align:middle;">
                                      <span style="display:inline-block;border-radius:999px;background:#ecfeff;border:1px solid #bae6fd;padding:7px 11px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;color:#0284c7;">
                                        Notification
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <tr>
                              <td style="border:1px solid #dbeafe;border-radius:28px;background:#ffffff;overflow:hidden;box-shadow:0 24px 60px rgba(14,165,233,0.13);">
                                <div style="height:8px;background:linear-gradient(90deg,#0ea5e9 0%%,#06b6d4 45%%,#10b981 100%%);"></div>

                                <div style="padding:30px 30px 28px;background:
                                  radial-gradient(circle at 92%% 0%%,rgba(16,185,129,0.13) 0,rgba(16,185,129,0) 34%%),
                                  radial-gradient(circle at 0%% 0%%,rgba(14,165,233,0.16) 0,rgba(14,165,233,0) 36%%),
                                  #ffffff;">
                                  <span style="display:inline-block;margin-bottom:14px;padding:7px 12px;border-radius:999px;background:%s;border:1px solid #bae6fd;color:%s;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">
                                    %s
                                  </span>

                                  <h1 style="margin:0;font-size:27px;line-height:1.28;font-weight:950;letter-spacing:-0.04em;color:#0f172a;">
                                    %s
                                  </h1>

                                  <p style="margin:16px 0 0;font-size:15px;line-height:1.75;color:#475569;">
                                    Xin chào <strong style="color:#0f172a;">%s</strong>,
                                  </p>

                                  <div style="margin-top:10px;padding:16px 18px;border-radius:20px;background:#f8fcff;border:1px solid #e0f2fe;">
                                    <p style="margin:0;white-space:pre-line;font-size:15px;line-height:1.75;color:#475569;">%s</p>
                                  </div>

                                  %s
                                  %s
                                  %s
                                </div>

                                <div style="padding:18px 30px;border-top:1px solid #e0f2fe;background:#f8fcff;">
                                  <p style="margin:0;font-size:12px;line-height:1.7;color:#94a3b8;">
                                    Email này được gửi tự động từ EventFlow. Bạn vẫn có thể xem thông báo trong ứng dụng.
                                  </p>
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td align="center" style="padding:18px 10px 0;">
                                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                                  EventFlow • AI Event Planning • FPT University Hanoi
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(
                escape(heading),
                accentSoftColor,
                accentColor,
                escape(badgeLabel),
                escape(heading),
                escape(userName),
                escape(plainText),
                taskBlock,
                cta,
                fallbackLink
        );
    }

    private String resolveEmailBadgeLabel(Notification notification) {
        if (notification == null || notification.getType() == null) {
            return "Thông báo";
        }

        return switch (notification.getType()) {
            case OVERDUE -> "Quá hạn";
            case UPCOMING -> "Sắp đến hạn";
            case TASK_ASSIGNED -> "Công việc mới";
            case TASK_UPDATED -> "Cập nhật task";
            case TASK_REVIEW_REQUESTED -> "Cần duyệt";
            case TASK_REVIEWED -> "Đã duyệt";
            case CALENDAR_INVITE -> "Lịch mới";
            case CALENDAR_UPDATED -> "Cập nhật lịch";
            case CALENDAR_REMINDER_TOMORROW -> "Nhắc lịch ngày mai";
            case CALENDAR_REMINDER_SOON -> "Nhắc lịch sắp diễn ra";
            case FEEDBACK_REVIEWING -> "Đang xem feedback";
            case FEEDBACK_RESPONDED -> "Phản hồi feedback";
            case FEEDBACK_CLOSED -> "Đã đóng feedback";
        };
    }

    private String resolveEmailActionLabel(Notification notification, Task task) {
        if (task != null) {
            return "Mở công việc";
        }

        if (notification != null && notification.getCalendarEventId() != null) {
            return "Mở lịch sự kiện";
        }

        return "Mở EventFlow";
    }

    private String resolveEmailAccentColor(Notification notification) {
        if (notification == null || notification.getType() == null) {
            return "#0284c7";
        }

        return switch (notification.getType()) {
            case OVERDUE -> "#dc2626";
            case UPCOMING, CALENDAR_REMINDER_TOMORROW, CALENDAR_REMINDER_SOON -> "#d97706";
            case TASK_REVIEW_REQUESTED -> "#7c3aed";
            case TASK_REVIEWED -> "#059669";
            case CALENDAR_INVITE, CALENDAR_UPDATED -> "#0284c7";
            case TASK_ASSIGNED, TASK_UPDATED, FEEDBACK_REVIEWING, FEEDBACK_RESPONDED, FEEDBACK_CLOSED -> "#0891b2";
        };
    }

    private String resolveEmailAccentSoftColor(Notification notification) {
        if (notification == null || notification.getType() == null) {
            return "#ecfeff";
        }

        return switch (notification.getType()) {
            case OVERDUE -> "#fef2f2";
            case UPCOMING, CALENDAR_REMINDER_TOMORROW, CALENDAR_REMINDER_SOON -> "#fffbeb";
            case TASK_REVIEW_REQUESTED -> "#f5f3ff";
            case TASK_REVIEWED -> "#ecfdf5";
            case CALENDAR_INVITE, CALENDAR_UPDATED -> "#ecfeff";
            case TASK_ASSIGNED, TASK_UPDATED, FEEDBACK_REVIEWING, FEEDBACK_RESPONDED, FEEDBACK_CLOSED -> "#ecfeff";
        };
    }

    private String buildNotificationUrl(Notification notification, Task task) {
        Long eventId = notification.getEventId();
        if (eventId == null && task != null && task.getEvent() != null) {
            eventId = task.getEvent().getId();
        }
        if (eventId == null) {
            return normalizedFrontendUrl();
        }
        if (task != null && task.getId() != null) {
            return UriComponentsBuilder.fromHttpUrl(normalizedFrontendUrl())
                    .pathSegment("events", String.valueOf(eventId), "tasks", String.valueOf(task.getId()))
                    .toUriString();
        }
        if (notification.getCalendarEventId() != null) {
            return UriComponentsBuilder.fromHttpUrl(normalizedFrontendUrl())
                    .pathSegment("events", String.valueOf(eventId), "calendar")
                    .queryParam("calendarEventId", notification.getCalendarEventId())
                    .toUriString();
        }
        return UriComponentsBuilder.fromHttpUrl(normalizedFrontendUrl())
                .pathSegment("events", String.valueOf(eventId))
                .toUriString();
    }

    private String escape(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }

    private String normalizedFrontendUrl() {
        String value = frontendUrl == null || frontendUrl.isBlank() ? "http://localhost:5173" : frontendUrl.trim();
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private HttpEntity<Map<String, Object>> jsonEntity(Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }
}
