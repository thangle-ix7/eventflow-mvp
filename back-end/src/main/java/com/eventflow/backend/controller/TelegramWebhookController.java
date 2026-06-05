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
    private static final java.util.regex.Pattern LINK_TOKEN_PATTERN =
            java.util.regex.Pattern.compile("^[A-Za-z0-9_-]{20,120}$");

    @PostMapping("/telegram")
    public ResponseEntity<Void> handleTelegramUpdate(@RequestBody(required = false) TelegramUpdate update) {

        if (update == null) {
            return ResponseEntity.ok().build();
        }

        if (update.getCallbackQuery() != null) {
            handleCallback(update.getCallbackQuery());
            return ResponseEntity.ok().build();
        }

        if (update.getMessage() == null) {
            return ResponseEntity.ok().build();
        }

        TelegramUpdate.Message msg = update.getMessage();

        if (msg.getText() == null || msg.getChat() == null) {
            return ResponseEntity.ok().build();
        }

        String text = msg.getText();
        Long chatId = msg.getChat().getId();

        String rawToken = extractLinkToken(text);
        if (rawToken == null) {
            return ResponseEntity.ok().build();
        }

        log.info("Telegram link command received for chatId={}", chatId);

        try {
            telegramBotService.requestTelegramLinkConfirmation(rawToken, chatId.toString());
        } catch (Exception e) {
            telegramBotService.sendErrorMessage(chatId.toString());
        }

        return ResponseEntity.ok().build();
    }

    private void handleCallback(TelegramUpdate.CallbackQuery callbackQuery) {
        if (callbackQuery.getMessage() == null || callbackQuery.getMessage().getChat() == null) {
            return;
        }

        Long chatId = callbackQuery.getMessage().getChat().getId();
        try {
            telegramBotService.handleCallback(callbackQuery.getId(), callbackQuery.getData(), chatId.toString());
        } catch (Exception e) {
            telegramBotService.sendErrorMessage(chatId.toString());
        }
    }

    private String extractLinkToken(String text) {
        String trimmed = text == null ? "" : text.trim();
        if (trimmed.startsWith("/start")) {
            String[] parts = trimmed.split("\\s+", 2);
            return parts.length == 2 && !parts[1].isBlank() ? parts[1].trim() : null;
        }

        return LINK_TOKEN_PATTERN.matcher(trimmed).matches() ? trimmed : null;
    }

}
