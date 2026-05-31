package com.eventflow.backend.controller;

import com.eventflow.backend.dto.TelegramUpdate;
import com.eventflow.backend.service.TelegramBotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class TelegramWebhookController {

    private final TelegramBotService telegramBotService;

    @PostMapping("/telegram")
    public ResponseEntity<Void> handleTelegramUpdate(@RequestBody(required = false) TelegramUpdate update) {

        if (update == null || update.getMessage() == null) {
            return ResponseEntity.ok().build();
        }

        TelegramUpdate.Message msg = update.getMessage();

        if (msg.getText() == null || msg.getChat() == null) {
            return ResponseEntity.ok().build();
        }

        String text = msg.getText();
        Long chatId = msg.getChat().getId();

        log.info("Telegram: text={}, chatId={}", text, chatId);

        if (!text.startsWith("/start")) {
            return ResponseEntity.ok().build();
        }

        String[] parts = text.split("\\s+");

        if (parts.length < 2) {
            telegramBotService.sendErrorMessage(chatId.toString());
            return ResponseEntity.ok().build();
        }

        try {
            Long userId = Long.parseLong(parts[1]);
            telegramBotService.linkTelegramAccount(userId, chatId.toString());
        } catch (Exception e) {
            telegramBotService.sendErrorMessage(chatId.toString());
        }

        return ResponseEntity.ok().build();
    }

}
