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
import java.util.Locale;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@RequiredArgsConstructor
public class AbuseProtectionFilter extends OncePerRequestFilter {

    private final AuditLogService auditLogService;
    private final ApiSecurityResponseWriter responseWriter;

    @Value("${eventflow.security.abuse-protection.enabled:true}")
    private boolean enabled;

    @Value("${eventflow.security.abuse-protection.max-uri-length:2048}")
    private int maxUriLength;

    @Value("${eventflow.security.abuse-protection.max-query-length:4096}")
    private int maxQueryLength;

    @Value("${eventflow.security.abuse-protection.max-header-length:8192}")
    private int maxHeaderLength;

    @Value("${eventflow.security.abuse-protection.max-content-length-bytes:1048576}")
    private long maxContentLengthBytes;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        Violation violation = findViolation(request);
        if (violation != null) {
            auditLogService.logSecurityEvent(request, "ABUSE_BLOCKED", violation.status().value(), violation.reason());
            responseWriter.writeError(request, response, violation.status(), violation.message());
            return;
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null || !path.startsWith("/api");
    }

    private Violation findViolation(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri != null && uri.length() > maxUriLength) {
            return new Violation(HttpStatus.URI_TOO_LONG, "URI_TOO_LONG", "Đường dẫn request quá dài");
        }

        String query = request.getQueryString();
        if (query != null && query.length() > maxQueryLength) {
            return new Violation(HttpStatus.URI_TOO_LONG, "QUERY_TOO_LONG", "Query string quá dài");
        }

        long contentLength = request.getContentLengthLong();
        if (contentLength > maxContentLengthBytes) {
            return new Violation(HttpStatus.PAYLOAD_TOO_LARGE, "PAYLOAD_TOO_LARGE", "Request body quá lớn");
        }

        if (hasOversizedHeader(request)) {
            return new Violation(HttpStatus.REQUEST_HEADER_FIELDS_TOO_LARGE, "HEADER_TOO_LARGE", "Request header quá lớn");
        }

        String target = ((uri != null ? uri : "") + "?" + (query != null ? query : "")).toLowerCase(Locale.ROOT);
        if (containsSuspiciousPattern(target)) {
            return new Violation(HttpStatus.BAD_REQUEST, "SUSPICIOUS_REQUEST_PATTERN", "Request không hợp lệ");
        }

        return null;
    }

    private boolean hasOversizedHeader(HttpServletRequest request) {
        var headerNames = request.getHeaderNames();
        while (headerNames != null && headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            var values = request.getHeaders(headerName);
            while (values != null && values.hasMoreElements()) {
                String value = values.nextElement();
                if (value != null && value.length() > maxHeaderLength) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean containsSuspiciousPattern(String target) {
        return target.contains("../")
                || target.contains("..\\")
                || target.contains("%2e%2e")
                || target.contains("%00")
                || target.contains("\u0000")
                || target.contains("<script")
                || target.contains("</script")
                || target.contains("{{")
                || target.contains("${");
    }

    private record Violation(HttpStatus status, String reason, String message) {
    }
}
