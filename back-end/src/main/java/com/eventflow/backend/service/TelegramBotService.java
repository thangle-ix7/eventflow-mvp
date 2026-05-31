package com.eventflow.backend.service;

import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

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

    public void linkTelegramAccount(Long userId, String chatId) {
        int updatedRows = userRepository.updateTelegramChatId(userId, chatId);
        if (updatedRows > 0) {
            sendMessage(chatId, "Kết nối tài khoản EventFlow thành công! Bạn sẽ nhận được cảnh báo tự động tại đây.");
        } else {
            sendMessage(chatId, "Không tìm thấy tài khoản EventFlow tương ứng với ID này. Vui lòng kiểm tra lại link kết nối.");
        }
    }

    public void sendErrorMessage(String chatId) {
        sendMessage(chatId, "Vui lòng kết nối thông qua ứng dụng EventFlow để đồng bộ tài khoản.");
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
