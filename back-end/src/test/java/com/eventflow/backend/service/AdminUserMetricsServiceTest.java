package com.eventflow.backend.service;

import com.eventflow.backend.dto.AdminUserMetricsDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AdminUserMetricsServiceTest {

    private AdminUserMetricsService service;
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:admin-user-metrics-" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
                "sa",
                "");
        jdbcTemplate = new JdbcTemplate(dataSource);
        service = new AdminUserMetricsService(jdbcTemplate);

        jdbcTemplate.execute("""
                CREATE TABLE users (
                    id BIGINT PRIMARY KEY,
                    email_verified BOOLEAN NOT NULL,
                    personal_data_deleted_at TIMESTAMP
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE audit_logs (
                    id BIGINT PRIMARY KEY,
                    actor_user_id BIGINT,
                    status INT NOT NULL,
                    created_at TIMESTAMP NOT NULL
                )
                """);
    }

    @Test
    void getMetricsCountsActiveUsersAndDauMauRatios() {
        LocalDate today = LocalDate.now();
        LocalDateTime todayAtTen = today.atTime(10, 0);
        LocalDateTime yesterdayAtTen = today.minusDays(1).atTime(10, 0);
        LocalDateTime previousMonthAtTen = today.minusMonths(1).withDayOfMonth(1).atTime(10, 0);

        jdbcTemplate.update("INSERT INTO users (id, email_verified) VALUES (1, TRUE)");
        jdbcTemplate.update("INSERT INTO users (id, email_verified) VALUES (2, TRUE)");
        jdbcTemplate.update("INSERT INTO users (id, email_verified) VALUES (3, FALSE)");
        jdbcTemplate.update("INSERT INTO users (id, email_verified, personal_data_deleted_at) VALUES (4, TRUE, ?)", todayAtTen);

        jdbcTemplate.update("INSERT INTO audit_logs (id, actor_user_id, status, created_at) VALUES (1, 1, 200, ?)", todayAtTen);
        jdbcTemplate.update("INSERT INTO audit_logs (id, actor_user_id, status, created_at) VALUES (2, 1, 200, ?)", todayAtTen.plusHours(1));
        jdbcTemplate.update("INSERT INTO audit_logs (id, actor_user_id, status, created_at) VALUES (3, 2, 200, ?)", yesterdayAtTen);
        jdbcTemplate.update("INSERT INTO audit_logs (id, actor_user_id, status, created_at) VALUES (4, 3, 200, ?)", todayAtTen);
        jdbcTemplate.update("INSERT INTO audit_logs (id, actor_user_id, status, created_at) VALUES (5, 4, 200, ?)", todayAtTen);
        jdbcTemplate.update("INSERT INTO audit_logs (id, actor_user_id, status, created_at) VALUES (6, 2, 500, ?)", todayAtTen);
        jdbcTemplate.update("INSERT INTO audit_logs (id, actor_user_id, status, created_at) VALUES (7, 2, 200, ?)", previousMonthAtTen);

        AdminUserMetricsDTO metrics = service.getMetrics();

        assertThat(metrics.getTotalUsers()).isEqualTo(3);
        assertThat(metrics.getActiveUsers()).isEqualTo(2);
        assertThat(metrics.getDailyActiveUsers()).isEqualTo(1);
        assertThat(metrics.getMonthlyActiveUsers()).isEqualTo(2);
        assertThat(metrics.getDailyActiveOnTotalRatio()).isEqualTo(1.0 / 3.0);
        assertThat(metrics.getDauMauRatio()).isEqualTo(0.5);
        assertThat(metrics.getMeasuredDate()).isEqualTo(today);
        assertThat(metrics.getMeasuredMonth()).isEqualTo(today.withDayOfMonth(1));
        assertThat(metrics.getDailyActiveSeries()).hasSize(30);
        assertThat(metrics.getDailyActiveSeries().get(metrics.getDailyActiveSeries().size() - 1).getActiveUsers()).isEqualTo(1);
        assertThat(metrics.getMonthlyActiveSeries()).hasSize(12);
        assertThat(metrics.getMonthlyActiveSeries().get(metrics.getMonthlyActiveSeries().size() - 1).getActiveUsers()).isEqualTo(2);
    }
}


