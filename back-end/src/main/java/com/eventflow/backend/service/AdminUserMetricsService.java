package com.eventflow.backend.service;

import com.eventflow.backend.dto.AdminUserActivityPointDTO;
import com.eventflow.backend.dto.AdminUserMetricsDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminUserMetricsService {

    private static final int DAILY_SERIES_DAYS = 30;
    private static final int MONTHLY_SERIES_MONTHS = 12;
    private static final DateTimeFormatter MONTH_LABEL_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public AdminUserMetricsDTO getMetrics() {
        LocalDate today = LocalDate.now();
        LocalDate month = today.withDayOfMonth(1);
        LocalDateTime dayStart = today.atStartOfDay();
        LocalDateTime nextDayStart = today.plusDays(1).atStartOfDay();
        LocalDateTime monthStart = month.atStartOfDay();
        LocalDateTime nextMonthStart = month.plusMonths(1).atStartOfDay();

        long totalUsers = count("""
                SELECT COUNT(*)
                FROM users
                WHERE personal_data_deleted_at IS NULL
                """);
        long activeUsers = count("""
                SELECT COUNT(*)
                FROM users
                WHERE email_verified = TRUE
                  AND personal_data_deleted_at IS NULL
                """);
        long dailyActiveUsers = countActiveUsersBetween(dayStart, nextDayStart);
        long monthlyActiveUsers = countActiveUsersBetween(monthStart, nextMonthStart);

        return new AdminUserMetricsDTO(
                totalUsers,
                activeUsers,
                dailyActiveUsers,
                monthlyActiveUsers,
                ratio(dailyActiveUsers, totalUsers),
                ratio(dailyActiveUsers, monthlyActiveUsers),
                today,
                month,
                dailyActiveSeries(today),
                monthlyActiveSeries(month));
    }

    private List<AdminUserActivityPointDTO> dailyActiveSeries(LocalDate endDateInclusive) {
        LocalDate startDate = endDateInclusive.minusDays(DAILY_SERIES_DAYS - 1L);
        List<AdminUserActivityPointDTO> points = new ArrayList<>();
        for (LocalDate date = startDate; !date.isAfter(endDateInclusive); date = date.plusDays(1)) {
            long activeUsers = countActiveUsersBetween(date.atStartOfDay(), date.plusDays(1).atStartOfDay());
            points.add(new AdminUserActivityPointDTO(date.toString(), activeUsers));
        }
        return points;
    }

    private List<AdminUserActivityPointDTO> monthlyActiveSeries(LocalDate endMonthInclusive) {
        LocalDate startMonth = endMonthInclusive.minusMonths(MONTHLY_SERIES_MONTHS - 1L);
        List<AdminUserActivityPointDTO> points = new ArrayList<>();
        for (LocalDate month = startMonth; !month.isAfter(endMonthInclusive); month = month.plusMonths(1)) {
            long activeUsers = countActiveUsersBetween(month.atStartOfDay(), month.plusMonths(1).atStartOfDay());
            points.add(new AdminUserActivityPointDTO(month.format(MONTH_LABEL_FORMATTER), activeUsers));
        }
        return points;
    }

    private long countActiveUsersBetween(LocalDateTime startInclusive, LocalDateTime endExclusive) {
        Long value = jdbcTemplate.queryForObject("""
                SELECT COUNT(DISTINCT al.actor_user_id)
                FROM audit_logs al
                JOIN users u ON u.id = al.actor_user_id
                WHERE al.actor_user_id IS NOT NULL
                  AND al.status < 400
                  AND al.created_at >= ?
                  AND al.created_at < ?
                  AND u.email_verified = TRUE
                  AND u.personal_data_deleted_at IS NULL
                """, Long.class, startInclusive, endExclusive);
        return value != null ? value : 0L;
    }

    private long count(String sql) {
        Long value = jdbcTemplate.queryForObject(sql, Long.class);
        return value != null ? value : 0L;
    }

    private double ratio(long numerator, long denominator) {
        if (denominator <= 0) {
            return 0.0;
        }
        return (double) numerator / (double) denominator;
    }
}
