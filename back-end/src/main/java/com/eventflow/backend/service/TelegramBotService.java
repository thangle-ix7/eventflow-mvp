package com.eventflow.backend.service;

import com.eventflow.backend.dto.TelegramLinkTokenResponse;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramBotService {

    private final UserRepository userRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${telegram.link-token.ttl-minutes:10}")
    private long linkTokenTtlMinutes;

    @Transactional
    public TelegramLinkTokenResponse createLinkToken(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        String token = generateToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(linkTokenTtlMinutes);

        user.setTelegramLinkTokenHash(hashToken(token));
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
                        hashToken(rawToken.trim()),
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

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to hash Telegram link token", e);
        }
    }
}
