package com.eventflow.backend.service;

import com.eventflow.backend.dto.AdminEmailSettingsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SystemSettingsService {

    private static final String USER_EMAIL_NOTIFICATIONS_ENABLED = "user_email_notifications_enabled";

    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public AdminEmailSettingsResponse getEmailSettings() {
        return new AdminEmailSettingsResponse(isUserEmailNotificationsEnabled());
    }

    @Transactional
    public AdminEmailSettingsResponse updateEmailSettings(boolean enabled) {
        jdbcTemplate.update("""
                INSERT INTO system_settings (setting_key, setting_value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (setting_key)
                DO UPDATE SET setting_value = EXCLUDED.setting_value,
                              updated_at = CURRENT_TIMESTAMP
                """, USER_EMAIL_NOTIFICATIONS_ENABLED, Boolean.toString(enabled));
        return new AdminEmailSettingsResponse(enabled);
    }

    @Transactional(readOnly = true)
    public boolean isUserEmailNotificationsEnabled() {
        try {
            String value = jdbcTemplate.queryForObject(
                    "SELECT setting_value FROM system_settings WHERE setting_key = ?",
                    String.class,
                    USER_EMAIL_NOTIFICATIONS_ENABLED);
            return value == null || Boolean.parseBoolean(value);
        } catch (EmptyResultDataAccessException e) {
            return true;
        }
    }
}
