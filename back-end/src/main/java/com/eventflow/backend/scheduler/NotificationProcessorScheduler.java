package com.eventflow.backend.scheduler;

import com.eventflow.backend.entity.NotiStatus;
import com.eventflow.backend.entity.Notification;
import com.eventflow.backend.service.NotificationSenderService;
import com.eventflow.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationProcessorScheduler {

    private final NotificationRepository notificationRepository;
    private final NotificationSenderService notificationSenderService;

    @Scheduled(fixedRate = 60 * 1000) // Every 1 minute
    @Transactional
    public void processPendingNotifications() {
        List<Notification> pendingNotifications = notificationRepository.findPendingWithDetails(NotiStatus.PENDING);

        if (pendingNotifications.isEmpty()) {
            return;
        }

        log.info("Processing {} pending notifications", pendingNotifications.size());

        for (Notification notification : pendingNotifications) {
            try {
                notificationSenderService.processNotification(notification);
            } catch (Exception e) {
                log.error("Unexpected error processing notification id={}: {}", notification.getId(), e.getMessage(), e);
            }
        }
    }
}
