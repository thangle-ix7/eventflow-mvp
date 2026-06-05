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
                    CALENDAR_INVITE, CALENDAR_UPDATED, CALENDAR_REMINDER_TOMORROW, CALENDAR_REMINDER_SOON ->
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
            return "Event Flow - " + title;
        }
        return switch (notification.getType()) {
            case OVERDUE -> "Event Flow - Công việc đã quá hạn";
            case UPCOMING, CALENDAR_REMINDER_TOMORROW, CALENDAR_REMINDER_SOON -> "Event Flow - Nhắc việc sắp đến hạn";
            case TASK_ASSIGNED -> "Event Flow - Bạn được giao công việc mới";
            case TASK_UPDATED -> "Event Flow - Công việc vừa được cập nhật";
            case TASK_REVIEW_REQUESTED -> "Event Flow - Cần duyệt công việc";
            case TASK_REVIEWED -> "Event Flow - Công việc đã được duyệt";
            case CALENDAR_INVITE, CALENDAR_UPDATED -> "Event Flow - Cập nhật lịch sự kiện";
        };
    }

    private String buildNotificationHtml(Notification notification, User user, Task task, String text) {
        String userName = user != null ? user.getName() : "bạn";
        String heading = notification.getTitle() != null && !notification.getTitle().isBlank()
                ? notification.getTitle()
                : "Bạn có thông báo mới";
        String taskTitle = task != null ? task.getTitle() : null;
        String actionUrl = buildNotificationUrl(notification, task);
        String toneColor = notification.getType() == com.eventflow.backend.entity.NotiType.OVERDUE ? "#dc2626" : "#4f46e5";
        String cta = actionUrl == null ? "" : """
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                  <tr>
                    <td style="border-radius:12px;background:%s;">
                      <a href="%s" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 20px;border-radius:12px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;">%s</a>
                    </td>
                  </tr>
                </table>
                """.formatted(toneColor, escape(actionUrl), task != null ? "Mở công việc" : "Mở Event Flow");
        String fallbackLink = actionUrl == null ? "" : """
                <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#64748b;">Nếu nút không mở được, dùng link này:</p>
                <p style="margin:8px 0 0;word-break:break-all;font-size:12px;line-height:1.6;">
                  <a href="%s" target="_blank" rel="noopener noreferrer" style="color:#4f46e5;text-decoration:underline;">%s</a>
                </p>
                """.formatted(escape(actionUrl), escape(actionUrl));
        String taskBlock = taskTitle == null ? "" : """
                <div style="margin-top:18px;padding:14px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;">
                  <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#64748b;">Công việc</div>
                  <div style="margin-top:6px;font-size:16px;font-weight:900;color:#0f172a;">%s</div>
                  <div style="margin-top:8px;font-size:13px;color:#64748b;">Deadline: %s</div>
                </div>
                """.formatted(escape(taskTitle), escape(task.getDeadline() != null ? task.getDeadline().toString().replace('T', ' ') : "Chưa có"));

        return """
                <!doctype html>
                <html lang="vi">
                  <body style="margin:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:28px 14px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,0.08);">
                            <tr>
                              <td style="padding:24px 28px;background:#020617;color:#ffffff;">
                                <div style="font-size:20px;font-weight:900;">Event Flow</div>
                                <div style="margin-top:6px;color:#cbd5e1;font-size:13px;">Nhắc việc và cập nhật vận hành sự kiện</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:28px;">
                                <div style="display:inline-block;margin-bottom:14px;padding:6px 10px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:12px;font-weight:800;text-transform:uppercase;">Thông báo</div>
                                <h1 style="margin:0;font-size:25px;line-height:1.3;font-weight:900;color:#0f172a;">%s</h1>
                                <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#475569;">Xin chào <strong>%s</strong>,</p>
                                <p style="margin:8px 0 0;white-space:pre-line;font-size:15px;line-height:1.7;color:#475569;">%s</p>
                                %s
                                %s
                                %s
                                <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#94a3b8;">Email này được gửi tự động từ Event Flow. Bạn vẫn có thể xem thông báo trong ứng dụng.</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(escape(heading), escape(userName), escape(text), taskBlock, cta, fallbackLink);
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
