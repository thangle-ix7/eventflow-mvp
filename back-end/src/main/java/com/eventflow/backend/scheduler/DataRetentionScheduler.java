package com.eventflow.backend.scheduler;

import com.eventflow.backend.repository.AuditLogRepository;
import com.eventflow.backend.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataRetentionScheduler {

    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditLogRepository auditLogRepository;

    @Value("${eventflow.retention.enabled:true}")
    private boolean enabled;

    @Value("${eventflow.retention.audit-log-days:180}")
    private long auditLogDays;

    @Value("${eventflow.retention.revoked-refresh-token-days:30}")
    private long revokedRefreshTokenDays;

    @Scheduled(cron = "${eventflow.retention.cleanup-cron:0 20 3 * * *}")
    @Transactional
    public void cleanupExpiredSecurityData() {
        if (!enabled) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        long expiredRefreshTokens = refreshTokenRepository.deleteByExpiresAtBefore(now);
        long oldRevokedRefreshTokens = refreshTokenRepository.deleteByRevokedAtBefore(
                now.minusDays(Math.max(revokedRefreshTokenDays, 1)));
        long oldAuditLogs = auditLogRepository.deleteByCreatedAtBefore(
                now.minusDays(Math.max(auditLogDays, 1)));

        if (expiredRefreshTokens > 0 || oldRevokedRefreshTokens > 0 || oldAuditLogs > 0) {
            log.info(
                    "Data retention cleanup removed expiredRefreshTokens={}, oldRevokedRefreshTokens={}, oldAuditLogs={}",
                    expiredRefreshTokens,
                    oldRevokedRefreshTokens,
                    oldAuditLogs);
        }
    }
}
