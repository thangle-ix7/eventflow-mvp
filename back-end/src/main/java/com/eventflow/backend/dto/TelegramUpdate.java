package com.eventflow.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class TelegramUpdate {
    private Message message;

    @JsonProperty("callback_query")
    private CallbackQuery callbackQuery;

    @Data
    public static class Message {
        private Chat chat;
        private String text;
    }

    @Data
    public static class Chat {
        private Long id;
    }

    @Data
    public static class CallbackQuery {
        private String id;
        private Message message;
        private String data;
    }
}
