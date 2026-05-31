package com.eventflow.backend.security;

import com.eventflow.backend.service.AuditLogService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 15)
@RequiredArgsConstructor
public class RateLimitingFilter extends OncePerRequestFilter {

    private final AuditLogService auditLogService;
    private final ApiSecurityResponseWriter responseWriter;
    private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();

    @Value("${eventflow.security.rate-limit.enabled:true}")
    private boolean enabled;

    @Value("${eventflow.security.rate-limit.window-seconds:60}")
    private long windowSeconds;

    @Value("${eventflow.security.rate-limit.auth-per-minute:20}")
    private int authPerMinute;

    @Value("${eventflow.security.rate-limit.read-per-minute:300}")
    private int readPerMinute;

    @Value("${eventflow.security.rate-limit.write-per-minute:120}")
    private int writePerMinute;

    @Value("${eventflow.security.rate-limit.webhook-per-minute:120}")
    private int webhookPerMinute;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if (!enabled || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        RateLimitDecision decision = evaluate(request);
        addHeaders(response, decision);

        if (!decision.allowed()) {
            auditLogService.logSecurityEvent(
                    request,
                    "RATE_LIMIT_EXCEEDED",
                    HttpStatus.TOO_MANY_REQUESTS.value(),
                    "category=" + decision.category() + ", limit=" + decision.limit());
            response.setHeader("Retry-After", String.valueOf(decision.retryAfterSeconds()));
            responseWriter.writeError(
                    request,
                    response,
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Quá nhiều request. Vui lòng thử lại sau.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null || !path.startsWith("/api") || path.startsWith("/actuator");
    }

    private RateLimitDecision evaluate(HttpServletRequest request) {
        cleanupExpiredCounters();

        String category = categoryFor(request);
        int limit = Math.max(limitFor(category), 1);
        long effectiveWindowSeconds = Math.max(windowSeconds, 1);
        long now = Instant.now().getEpochSecond();
        String key = auditLogService.resolveClientIp(request) + ":" + category;
        WindowCounter counter = counters.computeIfAbsent(key, ignored -> new WindowCounter(now));

        synchronized (counter) {
            if (now - counter.windowStartEpochSecond >= effectiveWindowSeconds) {
                counter.windowStartEpochSecond = now;
                counter.count.set(0);
            }

            int current = counter.count.incrementAndGet();
            int remaining = Math.max(limit - current, 0);
            long retryAfterSeconds = Math.max(effectiveWindowSeconds - (now - counter.windowStartEpochSecond), 1);

            return new RateLimitDecision(
                    current <= limit,
                    category,
                    limit,
                    remaining,
                    retryAfterSeconds,
                    effectiveWindowSeconds);
        }
    }

    private void addHeaders(HttpServletResponse response, RateLimitDecision decision) {
        response.setHeader("X-RateLimit-Limit", String.valueOf(decision.limit()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(decision.remaining()));
        response.setHeader("X-RateLimit-Window-Seconds", String.valueOf(decision.windowSeconds()));
    }

    private String categoryFor(HttpServletRequest request) {
        String path = request.getRequestURI().toLowerCase(Locale.ROOT);
        String method = request.getMethod();

        if (path.startsWith("/api/auth/") || path.startsWith("/api/v1/auth/")) {
            return "AUTH";
        }

        if (path.startsWith("/api/webhooks/") || path.startsWith("/api/v1/webhooks/")) {
            return "WEBHOOK";
        }

        if (!("GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method))) {
            return "WRITE";
        }

        return "READ";
    }

    private int limitFor(String category) {
        return switch (category) {
            case "AUTH" -> authPerMinute;
            case "WEBHOOK" -> webhookPerMinute;
            case "WRITE" -> writePerMinute;
            default -> readPerMinute;
        };
    }

    private void cleanupExpiredCounters() {
        if (counters.size() < 10_000) {
            return;
        }

        long now = Instant.now().getEpochSecond();
        Iterator<Map.Entry<String, WindowCounter>> iterator = counters.entrySet().iterator();
        long effectiveWindowSeconds = Math.max(windowSeconds, 1);
        while (iterator.hasNext()) {
            Map.Entry<String, WindowCounter> entry = iterator.next();
            if (now - entry.getValue().windowStartEpochSecond > effectiveWindowSeconds * 2) {
                iterator.remove();
            }
        }
    }

    private static class WindowCounter {
        private final AtomicInteger count = new AtomicInteger(0);
        private long windowStartEpochSecond;

        private WindowCounter(long windowStartEpochSecond) {
            this.windowStartEpochSecond = windowStartEpochSecond;
        }
    }

    private record RateLimitDecision(
            boolean allowed,
            String category,
            int limit,
            int remaining,
            long retryAfterSeconds,
            long windowSeconds) {
    }
}
