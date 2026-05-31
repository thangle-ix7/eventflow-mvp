package com.eventflow.backend.service;

import com.eventflow.backend.dto.AiActionDraft;
import com.eventflow.backend.dto.AiChatRequest;
import com.eventflow.backend.dto.AiChatResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.LinkedHashMap;
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

    @Value("${eventflow.ai.openai.model:gpt-4.1-mini}")
    private String model;

    @Value("${eventflow.ai.openai.enabled:true}")
    private boolean enabled;

    public Optional<AiChatResponse> plan(AiChatRequest request) {
        if (!enabled || apiKey == null || apiKey.isBlank()) {
            return Optional.empty();
        }

        try {
            RestClient restClient = RestClient.builder()
                    .baseUrl("https://api.openai.com/v1")
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .build();

            JsonNode response = restClient.post()
                    .uri("/responses")
                    .body(buildRequest(request))
                    .retrieve()
                    .body(JsonNode.class);

            String outputText = extractOutputText(response);
            if (outputText == null || outputText.isBlank()) {
                return Optional.empty();
            }

            AiChatResponse parsed = objectMapper.readValue(outputText, AiChatResponse.class);
            if (parsed.getDraft() == null) {
                parsed.setDraft(new AiActionDraft());
            }
            return Optional.of(parsed);
        } catch (RuntimeException e) {
            log.warn("OpenAI assistant unavailable, falling back to local parser: {}", e.getMessage());
            return Optional.empty();
        } catch (Exception e) {
            log.warn("OpenAI assistant returned invalid response, falling back to local parser: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private Map<String, Object> buildRequest(AiChatRequest request) {
        return Map.of(
                "model", model,
                "instructions", buildInstructions(),
                "input", buildInput(request),
                "text", Map.of(
                        "format", Map.of(
                                "type", "json_schema",
                                "name", "eventflow_ai_response",
                                "strict", false,
                                "schema", responseSchema())));
    }

    private String buildInput(AiChatRequest request) {
        try {
            Map<String, Object> input = new LinkedHashMap<>();
            input.put("today", LocalDate.now().toString());
            input.put("currentContext", request.getContext());
            input.put("currentDraft", request.getDraft());
            input.put("userMessage", request.getMessage());
            return objectMapper.writeValueAsString(input);
        } catch (Exception e) {
            return request.getMessage();
        }
    }

    private String buildInstructions() {
        return """
                You are EventFlow AI, an operations assistant for FPTU event organizers.
                Your job is to understand Vietnamese user messages and maintain an actionable draft.
                Do not blindly treat every user answer as a task. If the message is irrelevant, unclear, or appears to be a style/preference request, ask a short clarification question.

                Supported intents:
                - CREATE_EVENT_WITH_TASKS: create a new event and optional tasks.
                - CREATE_TASKS_FOR_EVENT: create tasks for the current event from currentContext.eventId.
                - NONE: ask clarification.

                Event fields:
                - eventName: required for CREATE_EVENT_WITH_TASKS.
                - startTime: required ISO local datetime, e.g. 2026-06-02T08:00:00.
                - location: optional, ask if useful.
                - eventDescription: optional but infer a concise professional description when possible.

                Task fields:
                - title: short actionable Vietnamese title, not a random phrase.
                - description: professional implementation detail inferred from organizer experience.
                - deadline: ISO local datetime. Infer sensible deadlines before or at event start if the user does not specify.

                Confirmation:
                - Set readyToConfirm=true only when all required fields for the selected intent are complete and the user has not yet confirmed.
                - If the user says "xác nhận", "ok", "đồng ý", or equivalent and the draft is ready, keep the draft and set readyToConfirm=true. The server will execute.
                - Never set completed=true; only the server sets completed after service execution.

                Always return only JSON matching the schema.
                """;
    }

    private Map<String, Object> responseSchema() {
        Map<String, Object> taskSchema = Map.of(
                "type", "object",
                "additionalProperties", false,
                "properties", Map.of(
                        "title", Map.of("type", List.of("string", "null")),
                        "description", Map.of("type", List.of("string", "null")),
                        "deadline", Map.of("type", List.of("string", "null"))));

        Map<String, Object> draftSchema = Map.of(
                "type", "object",
                "additionalProperties", false,
                "properties", Map.of(
                        "intent", Map.of("type", List.of("string", "null")),
                        "step", Map.of("type", List.of("string", "null")),
                        "targetEventId", Map.of("type", List.of("integer", "null")),
                        "eventName", Map.of("type", List.of("string", "null")),
                        "eventDescription", Map.of("type", List.of("string", "null")),
                        "location", Map.of("type", List.of("string", "null")),
                        "startTime", Map.of("type", List.of("string", "null")),
                        "locationSkipped", Map.of("type", List.of("boolean", "null")),
                        "tasksSkipped", Map.of("type", List.of("boolean", "null")),
                        "tasks", Map.of("type", "array", "items", taskSchema)));

        return Map.of(
                "type", "object",
                "additionalProperties", false,
                "properties", Map.of(
                        "reply", Map.of("type", "string"),
                        "draft", draftSchema,
                        "readyToConfirm", Map.of("type", "boolean"),
                        "completed", Map.of("type", "boolean"),
                        "createdEvent", Map.of("type", List.of("object", "null")),
                        "targetEventId", Map.of("type", List.of("integer", "null")),
                        "createdTaskCount", Map.of("type", "integer")),
                "required", List.of("reply", "draft", "readyToConfirm", "completed", "targetEventId", "createdTaskCount"));
    }

    private String extractOutputText(JsonNode response) {
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
