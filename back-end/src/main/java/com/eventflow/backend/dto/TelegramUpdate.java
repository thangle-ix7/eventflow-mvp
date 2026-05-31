package com.eventflow.backend.dto;

import lombok.Data;

@Data
public class TelegramUpdate {
    private Message message;

    @Data
    public static class Message {
        private Chat chat;
        private String text;
    }

    @Data
    public static class Chat {
        private Long id;
    }
}
