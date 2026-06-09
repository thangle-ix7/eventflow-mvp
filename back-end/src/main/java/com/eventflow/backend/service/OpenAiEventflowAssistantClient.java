package com.eventflow.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OpenAiEventflowAssistantClient {

    private final ObjectMapper objectMapper;

    @Value("${eventflow.ai.openai.api-key:}")
    private String apiKey;

    @Value("${eventflow.ai.openai.model:llama-3.3-70b-versatile}")
    private String model;

    @Value("${eventflow.ai.openai.api-url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;

    @Value("${eventflow.ai.openai.enabled:true}")
    private boolean enabled;

    public Optional<JsonNode> generateJson(String systemInstructions, Map<String, Object> input) {
        if (!enabled || apiKey == null || apiKey.isBlank()) {
            return Optional.empty();
        }

        try {
            RestClient restClient = RestClient.builder()
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .build();

            JsonNode response = restClient.post()
                    .uri(apiUrl)
                    .body(Map.of(
                            "model", model,
                            "messages", List.of(
                                    Map.of("role", "system", "content", systemInstructions),
                                    Map.of("role", "user", "content", objectMapper.writeValueAsString(input))),
                            "response_format", Map.of("type", "json_object")))
                    .retrieve()
                    .body(JsonNode.class);

            String outputText = extractOutputText(response);
            if (outputText == null || outputText.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readTree(outputText));
        } catch (RuntimeException e) {
            log.warn("OpenAI suggestion unavailable, using local fallback: {}", e.getMessage());
            return Optional.empty();
        } catch (Exception e) {
            log.warn("OpenAI suggestion returned invalid JSON, using local fallback: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private String extractOutputText(JsonNode response) {
        JsonNode choices = response.path("choices");
        if (choices.isArray() && !choices.isEmpty()) {
            String content = choices.get(0).path("message").path("content").asText(null);
            if (content != null && !content.isBlank()) {
                return content;
            }
        }

        JsonNode output = response.path("output");
        if (!output.isArray()) {
            return response.path("output_text").asText(null);
        }

        for (JsonNode item : output) {
            JsonNode content = item.path("content");
            if (!content.isArray()) {
                continue;
            }
            for (JsonNode part : content) {
                String text = part.path("text").asText(null);
                if (text != null && !text.isBlank()) {
                    return text;
                }
            }
        }
        return response.path("output_text").asText(null);
    }
}
