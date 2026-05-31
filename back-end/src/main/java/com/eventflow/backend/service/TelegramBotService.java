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

@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramBotService {

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

    @Transactional
    public void linkTelegramAccount(String rawToken, String chatId) {
        if (rawToken == null || rawToken.isBlank()) {
            sendErrorMessage(chatId);
            return;
        }

        userRepository.findByTelegramLinkTokenHashAndTelegramLinkTokenExpiresAtAfter(
                        SecureTokenUtil.sha256Hex(rawToken.trim()),
                        LocalDateTime.now())
                .ifPresentOrElse(user -> {
                    user.setTelegramChatId(chatId);
                    user.setTelegramLinkTokenHash(null);
                    user.setTelegramLinkTokenExpiresAt(null);
                    userRepository.save(user);
                    sendMessage(chatId, "Kết nối tài khoản EventFlow thành công! Bạn sẽ nhận được cảnh báo tự động tại đây.");
                }, () -> sendErrorMessage(chatId));
    }

    public void sendErrorMessage(String chatId) {
        sendMessage(chatId, "Link kết nối không hợp lệ hoặc đã hết hạn. Vui lòng tạo lại link trong ứng dụng EventFlow.");
    }

    public void sendMessage(String chatId, String text) {
        String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
        
        Map<String, Object> params = new HashMap<>();
        params.put("chat_id", chatId);
        params.put("text", text);

        try {
            restTemplate.postForEntity(url, params, String.class);
        } catch (Exception e) {
            log.error("Error sending Telegram message to {}: {}", chatId, e.getMessage());
        }
    }

}
