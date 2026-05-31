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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RateLimitingFilterTest {

    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private RateLimitingFilter filter;

    @BeforeEach
    void setUp() {
        when(auditLogService.resolveClientIp(any())).thenReturn("127.0.0.1");
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        filter = new RateLimitingFilter(auditLogService, new ApiSecurityResponseWriter(objectMapper));
        ReflectionTestUtils.setField(filter, "enabled", true);
        ReflectionTestUtils.setField(filter, "windowSeconds", 60L);
        ReflectionTestUtils.setField(filter, "authPerMinute", 2);
        ReflectionTestUtils.setField(filter, "readPerMinute", 100);
        ReflectionTestUtils.setField(filter, "writePerMinute", 100);
        ReflectionTestUtils.setField(filter, "webhookPerMinute", 100);
    }

    @Test
    void blocksRequestsAfterCategoryLimitAndAuditsIt() throws Exception {
        CountingFilterChain chain = new CountingFilterChain();

        MockHttpServletResponse first = executeAuthRequest(chain);
        MockHttpServletResponse second = executeAuthRequest(chain);
        MockHttpServletResponse third = executeAuthRequest(chain);

        assertThat(chain.calls).isEqualTo(2);
        assertThat(first.getStatus()).isEqualTo(200);
        assertThat(second.getHeader("X-RateLimit-Remaining")).isEqualTo("0");
        assertThat(third.getStatus()).isEqualTo(429);
        assertThat(third.getHeader("Retry-After")).isNotBlank();
        assertThat(third.getHeader("X-RateLimit-Limit")).isEqualTo("2");
        assertThat(third.getContentAsString()).contains("Too Many Requests");
        verify(auditLogService).logSecurityEvent(
                any(),
                eq("RATE_LIMIT_EXCEEDED"),
                eq(429),
                contains("category=AUTH"));
    }

    private MockHttpServletResponse executeAuthRequest(FilterChain chain) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        return response;
    }

    private static class CountingFilterChain implements FilterChain {
        private int calls;

        @Override
        public void doFilter(ServletRequest request, ServletResponse response) throws IOException, ServletException {
            calls++;
        }
    }
}
