package com.eventflow.backend.security;

import com.eventflow.backend.service.AuditLogService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class RequestAuditFilterTest {

    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final RequestAuditFilter filter = new RequestAuditFilter(auditLogService);

    @Test
    void addsRequestIdAndAuditsApiRequest() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/events");
        request.addHeader("X-Request-Id", "request-123");
        MockHttpServletResponse response = new MockHttpServletResponse();
        CountingFilterChain chain = new CountingFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(chain.calls).isEqualTo(1);
        assertThat(response.getHeader("X-Request-Id")).isEqualTo("request-123");
        assertThat(request.getAttribute(AuditLogService.REQUEST_ID_ATTRIBUTE)).isEqualTo("request-123");
        verify(auditLogService).logRequest(request, 200, null);
    }

    private static class CountingFilterChain implements FilterChain {
        private int calls;

        @Override
        public void doFilter(ServletRequest request, ServletResponse response) throws IOException, ServletException {
            calls++;
        }
    }
}
