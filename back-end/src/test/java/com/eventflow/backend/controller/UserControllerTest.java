package com.eventflow.backend.controller;

import com.eventflow.backend.exception.GlobalExceptionHandler;
import com.eventflow.backend.repository.NotificationRepository;
import com.eventflow.backend.service.TelegramBotService;
import com.eventflow.backend.service.UserProfileService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.security.Principal;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserControllerTest {

    private final TelegramBotService telegramBotService = mock(TelegramBotService.class);
    private final UserProfileService userProfileService = mock(UserProfileService.class);
    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);

    private JdbcTemplate jdbcTemplate;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:user-controller-" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
                "sa",
                "");
        jdbcTemplate = new JdbcTemplate(dataSource);
        createNotificationSchema();

        UserController controller = new UserController(
                telegramBotService,
                userProfileService,
                notificationRepository,
                jdbcTemplate);
        ObjectMapper objectMapper = new ObjectMapper()
                .findAndRegisterModules()
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void getNotificationsReturnsRowsEvenWhenStoredTypeIsLegacyValue() throws Exception {
        jdbcTemplate.update("""
                INSERT INTO notifications
                    (id, user_id, channel, type, status, created_at)
                VALUES
                    (9, 42, 'IN_APP', 'LEGACY_MANUAL', 'QUEUED', TIMESTAMP '2026-06-04 08:00:00')
                """);

        mockMvc.perform(get("/api/v1/users/42/notifications")
                        .principal(authenticatedUser(42L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(9))
                .andExpect(jsonPath("$[0].type").value("LEGACY_MANUAL"))
                .andExpect(jsonPath("$[0].channel").value("IN_APP"));
    }

    @Test
    void getNotificationsIncludesCalendarEventContext() throws Exception {
        jdbcTemplate.update("INSERT INTO events (id, name) VALUES (20, 'Launch Day')");
        jdbcTemplate.update("""
                INSERT INTO calendar_event (id, event_id, start_time)
                VALUES (11, 20, TIMESTAMP '2026-06-05 09:30:00')
                """);
        jdbcTemplate.update("""
                INSERT INTO notifications
                    (id, user_id, calendar_event_id, channel, type, status, title, message, created_at)
                VALUES
                    (10, 42, 11, 'EMAIL', 'CALENDAR_INVITE', 'PENDING',
                     'Lịch họp mới', 'Bạn có lịch mới.', TIMESTAMP '2026-06-04 09:00:00')
                """);

        mockMvc.perform(get("/api/v1/users/42/notifications")
                        .principal(authenticatedUser(42L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].calendarEventId").value(11))
                .andExpect(jsonPath("$[0].eventId").value(20))
                .andExpect(jsonPath("$[0].eventName").value("Launch Day"))
                .andExpect(jsonPath("$[0].calendarStartTime").value("2026-06-05T09:30:00"));
    }

    @Test
    void disconnectTelegramAllowsAuthenticatedOwner() throws Exception {
        mockMvc.perform(delete("/api/v1/users/42/telegram-connection")
                        .principal(authenticatedUser(42L)))
                .andExpect(status().isNoContent());

        verify(telegramBotService).disconnectTelegramAccount(42L);
    }

    @Test
    void disconnectTelegramRejectsDifferentUser() throws Exception {
        mockMvc.perform(delete("/api/v1/users/42/telegram-connection")
                        .principal(authenticatedUser(99L)))
                .andExpect(status().isForbidden());

        verify(telegramBotService, never()).disconnectTelegramAccount(42L);
    }

    private void createNotificationSchema() {
        jdbcTemplate.execute("""
                CREATE TABLE events (
                    id BIGINT PRIMARY KEY,
                    name VARCHAR(255)
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE tasks (
                    id BIGINT PRIMARY KEY,
                    event_id BIGINT,
                    title VARCHAR(255),
                    deadline TIMESTAMP
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE calendar_event (
                    id BIGINT PRIMARY KEY,
                    event_id BIGINT,
                    start_time TIMESTAMP
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE notifications (
                    id BIGINT PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    task_id BIGINT,
                    event_id BIGINT,
                    calendar_event_id BIGINT,
                    channel VARCHAR(20),
                    type VARCHAR(40),
                    status VARCHAR(20),
                    title VARCHAR(300),
                    message TEXT,
                    deadline TIMESTAMP,
                    created_at TIMESTAMP,
                    sent_at TIMESTAMP,
                    read_at TIMESTAMP,
                    error_log TEXT
                )
                """);
    }

    private Principal authenticatedUser(Long userId) {
        TestingAuthenticationToken authentication = new TestingAuthenticationToken(userId, null);
        authentication.setAuthenticated(true);
        return authentication;
    }
}
