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
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationSenderService {

    private final NotificationRepository notificationRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final JavaMailSender javaMailSender;

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${spring.mail.from:noreply@eventflow.com}")
    private String fromEmail;

    public void processNotification(Notification notification) {
        User user = notification.getUser();
        Task task = notification.getTask();
        NotiChannel channel = notification.getChannel();

        String message = buildMessage(notification, user, task);

        boolean sent = false;

        if (channel == NotiChannel.TELEGRAM && user.getTelegramChatId() != null) {
            sent = sendTelegram(user.getTelegramChatId(), message);
        } else {
            sent = sendEmail(user.getEmail(), message);
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
            String url = UriComponentsBuilder.fromHttpUrl("https://api.telegram.org/bot" + botToken + "/sendMessage")
                    .queryParam("chat_id", chatId)
                    .queryParam("text", text)
                    .toUriString();

            Map<String, Object> response = restTemplate.postForObject(url, null, Map.class);
            return response != null && Boolean.TRUE.equals(response.get("ok"));
        } catch (RestClientException e) {
            log.error("Telegram send failed for chatId={}: {}", chatId, e.getMessage());
            return false;
        }
    }

    private boolean sendEmail(String toEmail, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("EventFlow - Nhắc nhở công việc");
            message.setText(text);
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
        };
    }
}
