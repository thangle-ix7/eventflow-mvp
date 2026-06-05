package com.eventflow.backend.service;

import com.eventflow.backend.dto.TelegramLinkTokenResponse;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.UserRepository;
import com.eventflow.backend.util.SecureTokenUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramBotService {

    private static final String CALLBACK_CONFIRM_PREFIX = "confirm:";
    private static final String CALLBACK_CANCEL_PREFIX = "cancel:";

    private final UserRepository userRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${telegram.link-token.ttl-minutes:10}")
    private long linkTokenTtlMinutes;

    @Transactional
    public TelegramLinkTokenResponse createLinkToken(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        String token = SecureTokenUtil.generateToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(linkTokenTtlMinutes);

        user.setTelegramLinkTokenHash(SecureTokenUtil.sha256Hex(token));
        user.setTelegramLinkTokenExpiresAt(expiresAt);
        userRepository.save(user);

        return new TelegramLinkTokenResponse(token, expiresAt);
    }

    @Transactional(readOnly = true)
    public void requestTelegramLinkConfirmation(String rawToken, String chatId) {
        if (rawToken == null || rawToken.isBlank()) {
            sendErrorMessage(chatId);
            return;
        }

        findUserByRawToken(rawToken)
                .ifPresentOrElse(user -> sendConfirmationMessage(rawToken.trim(), chatId, user),
                        () -> sendErrorMessage(chatId));
    }

    @Transactional
    public void handleCallback(String callbackQueryId, String callbackData, String chatId) {
        if (callbackData == null || callbackData.isBlank()) {
            answerCallback(callbackQueryId, "Thao tác không hợp lệ.");
            sendErrorMessage(chatId);
            return;
        }

        if (callbackData.startsWith(CALLBACK_CANCEL_PREFIX)) {
            answerCallback(callbackQueryId, "Đã hủy kết nối Telegram.");
            sendMessage(chatId, "Đã hủy kết nối Telegram với EventFlow.");
            return;
        }

        if (!callbackData.startsWith(CALLBACK_CONFIRM_PREFIX)) {
            answerCallback(callbackQueryId, "Thao tác không hợp lệ.");
            sendErrorMessage(chatId);
            return;
        }

        boolean linked = linkTelegramAccount(callbackData.substring(CALLBACK_CONFIRM_PREFIX.length()), chatId);
        answerCallback(callbackQueryId, linked ? "Kết nối Telegram thành công." : "Link đã hết hạn hoặc không hợp lệ.");
    }

    @Transactional
    public boolean linkTelegramAccount(String rawToken, String chatId) {
        if (rawToken == null || rawToken.isBlank()) {
            sendErrorMessage(chatId);
            return false;
        }

        Optional<User> matchingUser = findUserByRawToken(rawToken);
        if (matchingUser.isPresent()) {
            User user = matchingUser.get();
            user.setTelegramChatId(chatId);
            user.setTelegramLinkTokenHash(null);
            user.setTelegramLinkTokenExpiresAt(null);
            userRepository.save(user);
            sendMessage(chatId, "Kết nối Telegram thành công với tài khoản EventFlow: "
                    + user.getName() + " (" + user.getEmail() + "). Bạn sẽ nhận nhắc việc tự động tại đây.");
            return true;
        }

        sendErrorMessage(chatId);
        return false;
    }

    @Transactional
    public void disconnectTelegramAccount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        String oldChatId = user.getTelegramChatId();
        user.setTelegramChatId(null);
        user.setTelegramLinkTokenHash(null);
        user.setTelegramLinkTokenExpiresAt(null);
        userRepository.save(user);

        if (oldChatId != null && !oldChatId.isBlank()) {
            sendMessage(oldChatId, "Tài khoản EventFlow của bạn đã ngắt kết nối Telegram.");
        }
    }

    public void sendErrorMessage(String chatId) {
        sendMessage(chatId, "Link kết nối không hợp lệ hoặc đã hết hạn. Vui lòng tạo lại link trong ứng dụng EventFlow.");
    }

    public void sendMessage(String chatId, String text) {
        sendMessage(chatId, text, null);
    }

    private void sendMessage(String chatId, String text, Map<String, Object> replyMarkup) {
        String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
        
        Map<String, Object> params = new HashMap<>();
        params.put("chat_id", chatId);
        params.put("text", text);
        if (replyMarkup != null) {
            params.put("reply_markup", replyMarkup);
        }

        try {
            restTemplate.postForEntity(url, params, String.class);
        } catch (Exception e) {
            log.error("Error sending Telegram message to {}: {}", chatId, e.getMessage());
        }
    }

    private Optional<User> findUserByRawToken(String rawToken) {
        return userRepository.findByTelegramLinkTokenHashAndTelegramLinkTokenExpiresAtAfter(
                SecureTokenUtil.sha256Hex(rawToken.trim()),
                LocalDateTime.now());
    }

    private void sendConfirmationMessage(String rawToken, String chatId, User user) {
        Map<String, Object> replyMarkup = Map.of(
                "inline_keyboard", new Object[][]{
                        {
                                Map.of("text", "Xác nhận", "callback_data", CALLBACK_CONFIRM_PREFIX + rawToken),
                                Map.of("text", "Hủy", "callback_data", CALLBACK_CANCEL_PREFIX + rawToken)
                        }
                });

        sendMessage(chatId,
                "Bạn muốn kết nối Telegram này với tài khoản EventFlow: "
                        + user.getName() + " (" + user.getEmail() + ")?",
                replyMarkup);
    }

    private void answerCallback(String callbackQueryId, String text) {
        if (callbackQueryId == null || callbackQueryId.isBlank()) {
            return;
        }

        String url = "https://api.telegram.org/bot" + botToken + "/answerCallbackQuery";
        Map<String, Object> params = new HashMap<>();
        params.put("callback_query_id", callbackQueryId);
        params.put("text", text);

        try {
            restTemplate.postForEntity(url, params, String.class);
        } catch (Exception e) {
            log.error("Error answering Telegram callback {}: {}", callbackQueryId, e.getMessage());
        }
    }

}
