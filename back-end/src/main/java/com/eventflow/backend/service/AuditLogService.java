package com.eventflow.backend.service;

import com.eventflow.backend.entity.AuditLog;
import com.eventflow.backend.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    public static final String ACTOR_USER_ID_ATTRIBUTE = "eventflow.actorUserId";
    public static final String REQUEST_ID_ATTRIBUTE = "eventflow.requestId";

    private final AuditLogRepository auditLogRepository;

    @Value("${eventflow.security.audit.enabled:true}")
    private boolean auditEnabled;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logRequest(HttpServletRequest request, int status, String details) {
        if (!auditEnabled || !shouldAudit(request, status)) {
            return;
        }

        saveAuditLog(request, actionFor(request), status, details);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logSecurityEvent(HttpServletRequest request, String action, int status, String details) {
        if (!auditEnabled) {
            return;
        }

        saveAuditLog(request, action, status, details);
    }

    private void saveAuditLog(HttpServletRequest request, String action, int status, String details) {
        try {
            auditLogRepository.save(AuditLog.builder()
                    .actorUserId(resolveActorUserId(request))
                    .action(truncate(action, 80))
                    .method(truncate(request.getMethod(), 10))
                    .path(truncate(request.getRequestURI(), 500))
                    .status(status)
                    .outcome(status < 400 ? "SUCCESS" : "FAILURE")
                    .ipAddress(truncate(resolveClientIp(request), 64))
                    .userAgent(truncate(request.getHeader("User-Agent"), 255))
                    .requestId(truncate(resolveRequestId(request), 64))
                    .details(truncate(details, 2000))
                    .build());
        } catch (Exception e) {
            log.warn("Failed to persist audit log for {} {}: {}", request.getMethod(), request.getRequestURI(), e.getMessage());
        }
    }

    private boolean shouldAudit(HttpServletRequest request, int status) {
        String path = request.getRequestURI();
        if (path == null || !path.startsWith("/api")) {
            return false;
        }

        String method = request.getMethod();
        return status >= 400
                || isAuthPath(path)
                || !("GET".equalsIgnoreCase(method)
                || "HEAD".equalsIgnoreCase(method)
                || "OPTIONS".equalsIgnoreCase(method));
    }

    private String actionFor(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod().toUpperCase();

        if (path.contains("/auth/login")) {
            return "AUTH_LOGIN";
        }
        if (path.contains("/auth/signup")) {
            return "AUTH_SIGNUP";
        }
        if (path.contains("/auth/forgot-password")) {
            return "AUTH_FORGOT_PASSWORD";
        }
        if (path.contains("/auth/reset-password")) {
            return "AUTH_RESET_PASSWORD";
        }
        if (path.contains("/auth/verify-email")) {
            return "AUTH_VERIFY_EMAIL";
        }
        if (path.contains("/telegram-link-token")) {
            return "TELEGRAM_LINK_TOKEN";
        }
        if (path.contains("/webhooks/")) {
            return "WEBHOOK";
        }

        return "API_" + method;
    }

    private boolean isAuthPath(String path) {
        return path.startsWith("/api/auth/")
                || path.startsWith("/api/v1/auth/");
    }

    private Long resolveActorUserId(HttpServletRequest request) {
        Object actor = request.getAttribute(ACTOR_USER_ID_ATTRIBUTE);
        if (actor instanceof Long id) {
            return id;
        }
        return null;
    }

    public String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }

    public String resolveRequestId(HttpServletRequest request) {
        Object requestId = request.getAttribute(REQUEST_ID_ATTRIBUTE);
        if (requestId instanceof String id && !id.isBlank()) {
            return id;
        }

        String headerRequestId = request.getHeader("X-Request-Id");
        return headerRequestId != null && !headerRequestId.isBlank() ? headerRequestId : null;
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}
