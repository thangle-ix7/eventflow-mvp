package com.eventflow.backend.controller;

import com.eventflow.backend.dto.CheckoutRequestDTO;
import com.eventflow.backend.dto.CheckoutResponseDTO;
import com.eventflow.backend.exception.GlobalExceptionHandler;
import com.eventflow.backend.security.AdminSecurityService;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.SubscriptionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.security.Principal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SubscriptionControllerTest {

    private final SubscriptionService subscriptionService = mock(SubscriptionService.class);
    private final EventSecurityService eventSecurityService = mock(EventSecurityService.class);
    private final AdminSecurityService adminSecurityService = mock(AdminSecurityService.class);
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        SubscriptionController controller = new SubscriptionController(
                subscriptionService,
                eventSecurityService,
                adminSecurityService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void previewCheckoutReturnsPriceWithoutCreatingCheckout() throws Exception {
        CheckoutRequestDTO request = new CheckoutRequestDTO();
        request.setPlanCode("EVENT_PREMIUM");
        request.setEventId(77L);
        request.setDiscountCode("VIP10");

        when(subscriptionService.previewCheckout(eq(42L), any(CheckoutRequestDTO.class)))
                .thenReturn(CheckoutResponseDTO.builder()
                        .provider("PREVIEW")
                        .status("PREVIEW")
                        .planCode("EVENT_PREMIUM")
                        .originalAmountVnd(999000L)
                        .discountAmountVnd(99900L)
                        .finalAmountVnd(899100L)
                        .discountCode("VIP10")
                        .build());

        mockMvc.perform(post("/api/v1/subscriptions/checkout/preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .principal(authenticatedUser(42L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("PREVIEW"))
                .andExpect(jsonPath("$.status").value("PREVIEW"))
                .andExpect(jsonPath("$.planCode").value("EVENT_PREMIUM"))
                .andExpect(jsonPath("$.discountAmountVnd").value(99900))
                .andExpect(jsonPath("$.finalAmountVnd").value(899100));

        verify(subscriptionService).previewCheckout(eq(42L), any(CheckoutRequestDTO.class));
    }

    @Test
    void createCheckoutKeepsCreatedStatusForRealPaymentOrder() throws Exception {
        CheckoutRequestDTO request = new CheckoutRequestDTO();
        request.setPlanCode("CLUB");

        when(subscriptionService.createCheckout(eq(42L), any(CheckoutRequestDTO.class)))
                .thenReturn(CheckoutResponseDTO.builder()
                        .provider("PAYOS")
                        .status("PENDING")
                        .planCode("CLUB")
                        .finalAmountVnd(199000L)
                        .checkoutUrl("https://pay.example/checkout")
                        .build());

        mockMvc.perform(post("/api/v1/subscriptions/checkout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .principal(authenticatedUser(42L)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.provider").value("PAYOS"))
                .andExpect(jsonPath("$.checkoutUrl").value("https://pay.example/checkout"));
    }

    private Principal authenticatedUser(Long userId) {
        TestingAuthenticationToken authentication = new TestingAuthenticationToken(userId, null);
        authentication.setAuthenticated(true);
        return authentication;
    }
}
