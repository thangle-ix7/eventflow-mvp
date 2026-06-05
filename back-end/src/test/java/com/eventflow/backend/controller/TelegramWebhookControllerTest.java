package com.eventflow.backend.controller;

import com.eventflow.backend.service.TelegramBotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TelegramWebhookControllerTest {

    private final TelegramBotService telegramBotService = mock(TelegramBotService.class);
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new TelegramWebhookController(telegramBotService))
                .build();
    }

    @Test
    void startCommandRequestsAccountConfirmation() throws Exception {
        mockMvc.perform(post("/api/webhooks/telegram")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "message": {
                                    "chat": { "id": 123456 },
                                    "text": "/start secure-token"
                                  }
                                }
                                """))
                .andExpect(status().isOk());

        verify(telegramBotService)
                .requestTelegramLinkConfirmation(eq("secure-token"), eq("123456"));
    }

    @Test
    void callbackQueryIsMappedFromTelegramSnakeCasePayload() throws Exception {
        mockMvc.perform(post("/api/webhooks/telegram")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "callback_query": {
                                    "id": "callback-1",
                                    "data": "confirm:secure-token",
                                    "message": {
                                      "chat": { "id": 123456 }
                                    }
                                  }
                                }
                                """))
                .andExpect(status().isOk());

        verify(telegramBotService)
                .handleCallback(eq("callback-1"), eq("confirm:secure-token"), eq("123456"));
    }
}
