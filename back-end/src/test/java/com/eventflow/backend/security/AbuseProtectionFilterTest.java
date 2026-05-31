package com.eventflow.backend.security;

import com.eventflow.backend.service.AuditLogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class AbuseProtectionFilterTest {

    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private AbuseProtectionFilter filter;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        filter = new AbuseProtectionFilter(auditLogService, new ApiSecurityResponseWriter(objectMapper));
        ReflectionTestUtils.setField(filter, "enabled", true);
        ReflectionTestUtils.setField(filter, "maxUriLength", 2048);
        ReflectionTestUtils.setField(filter, "maxQueryLength", 4096);
        ReflectionTestUtils.setField(filter, "maxHeaderLength", 8192);
        ReflectionTestUtils.setField(filter, "maxContentLengthBytes", 1024L);
    }

    @Test
    void blocksSuspiciousApiRequestAndAuditsIt() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/events/%2e%2e/secrets");
        MockHttpServletResponse response = new MockHttpServletResponse();
        CountingFilterChain chain = new CountingFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(chain.calls).isZero();
        assertThat(response.getStatus()).isEqualTo(400);
        assertThat(response.getContentAsString()).contains("Bad Request").doesNotContain("stackTrace");
        verify(auditLogService).logSecurityEvent(
                eq(request),
                eq("ABUSE_BLOCKED"),
                eq(400),
                eq("SUSPICIOUS_REQUEST_PATTERN"));
    }

    private static class CountingFilterChain implements FilterChain {
        private int calls;

        @Override
        public void doFilter(ServletRequest request, ServletResponse response) throws IOException, ServletException {
            calls++;
        }
    }
}
