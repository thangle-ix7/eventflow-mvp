package com.eventflow.backend.service;

import com.eventflow.backend.entity.NotiChannel;
import com.eventflow.backend.entity.NotiStatus;
import com.eventflow.backend.entity.NotiType;
import com.eventflow.backend.entity.Notification;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class NotificationSenderServiceTest {

    @Test
    void telegramNotificationDecodesLegacyUrlEncodedMessageAndSendsJson() {
        NotificationRepository notificationRepository = mock(NotificationRepository.class);
        SystemSettingsService systemSettingsService = mock(SystemSettingsService.class);
        when(systemSettingsService.isUserEmailNotificationsEnabled()).thenReturn(true);
        NotificationSenderService service = new NotificationSenderService(
                notificationRepository,
                mock(JavaMailSender.class),
                systemSettingsService);
        ReflectionTestUtils.setField(service, "botToken", "test-bot-token");

        RestTemplate restTemplate = (RestTemplate) ReflectionTestUtils.getField(service, "restTemplate");
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(requestTo("https://api.telegram.org/bottest-bot-token/sendMessage"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(containsString("Xin chào NGUYEN QUANG HAO")))
                .andExpect(content().string(not(containsString("Xin%20ch"))))
                .andRespond(withSuccess("{\"ok\":true}", MediaType.APPLICATION_JSON));

        User user = User.builder()
                .id(7L)
                .name("NGUYEN QUANG HAO")
                .email("hao@example.com")
                .password("password")
                .telegramChatId("123456")
                .build();
        Notification notification = Notification.builder()
                .id(99L)
                .user(user)
                .channel(NotiChannel.TELEGRAM)
                .type(NotiType.OVERDUE)
                .status(NotiStatus.PENDING)
                .message("Xin%20ch%C3%A0o%20NGUYEN%20QUANG%20HAO,%0A%0AC%C3%B4ng%20vi%E1%BB%87c%20%22H%E1%BB%8CC%22%20c%E1%BB%A7a%20b%E1%BA%A1n%20%C4%90%C3%83%20QU%C3%81%20H%E1%BA%A0N!")
                .build();

        service.processNotification(notification);

        server.verify();
        verify(notificationRepository).markAsSent(99L);
    }

    @Test
    void emailNotificationIsSkippedWhenAdminDisablesUserEmailNotifications() {
        NotificationRepository notificationRepository = mock(NotificationRepository.class);
        JavaMailSender javaMailSender = mock(JavaMailSender.class);
        SystemSettingsService systemSettingsService = mock(SystemSettingsService.class);
        when(systemSettingsService.isUserEmailNotificationsEnabled()).thenReturn(false);
        NotificationSenderService service = new NotificationSenderService(
                notificationRepository,
                javaMailSender,
                systemSettingsService);

        User user = User.builder()
                .id(8L)
                .name("Nguyen Van A")
                .email("user@example.com")
                .password("password")
                .build();
        Notification notification = Notification.builder()
                .id(100L)
                .user(user)
                .channel(NotiChannel.EMAIL)
                .type(NotiType.TASK_UPDATED)
                .status(NotiStatus.PENDING)
                .title("Task vừa được cập nhật")
                .build();

        service.processNotification(notification);

        verify(notificationRepository).markAsSent(100L);
        verify(javaMailSender, never()).createMimeMessage();
    }
}
