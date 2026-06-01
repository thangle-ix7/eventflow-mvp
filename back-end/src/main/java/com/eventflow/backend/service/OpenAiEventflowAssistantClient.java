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

    @Value("${eventflow.ai.openai.model:llama-3.3-70b-versatile}")
    private String model;

    @Value("${eventflow.ai.openai.api-url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;

    @Value("${eventflow.ai.openai.enabled:true}")
    private boolean enabled;

    public Optional<AiChatResponse> plan(AiChatRequest request) {
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
                "messages", List.of(
                        Map.of("role", "system", "content", buildInstructions()),
                        Map.of("role", "user", "content", buildInput(request))),
                "response_format", Map.of("type", "json_object"));
    }

    private String buildInput(AiChatRequest request) {
        try {
            Map<String, Object> input = new LinkedHashMap<>();
            input.put("today", LocalDate.now().toString());
            input.put("conversationHistory", request.getMessages());
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
                You are EventFlow AI, a Vietnamese chat assistant for FPTU event organizers.
                Behave like a normal helpful AI first: answer greetings, explain, brainstorm, suggest event ideas,
                remember the recent conversationHistory, and respond naturally to short follow-ups such as "có",
                "được", "ý tôi là", or "tiếp tục".

                Separately from the conversational reply, analyze whether the message and conversationHistory imply that
                EventFlow should prepare or execute a system action. The draft is the machine-readable action plan.
                Do not make the user feel like they are filling a rigid form; ask natural follow-up questions only when
                the system action is missing required data.

                Intents:
                - null: normal chat/advice/brainstorming. Use this for "hello", "gợi ý", "tôi không biết", "nên làm gì",
                  "lập kế hoạch thử", or any answer that should not create data yet.
                - CREATE_EVENT_WITH_TASKS: user wants to create a new event, optionally with tasks.
                - CREATE_TASKS_FOR_EVENT: user wants to create tasks for the current event from currentContext.eventId.

                For normal chat:
                - Put the useful conversational answer in reply.
                - Return draft.intent as null, readyToConfirm=false, completed=false.
                - You may suggest a concrete plan or task checklist, but do not set an action intent until the user says
                  they want to create/apply/save it.
                - If your reply asks "Bạn muốn tạo sự kiện/task này không?" or any equivalent yes/no question about creating
                  a concrete suggested item, you must return an action draft for that suggested item so a later answer like
                  "có" can continue the flow. Fill any inferred fields and ask for missing required fields next.
                - If the user answers "có"/"được"/"ok" to your previous offer to create an event or task, use conversationHistory
                  to infer the suggested item and return an action draft instead of restarting the greeting.

                For action mode:
                - Maintain a draft across turns using currentDraft.
                - Required for CREATE_EVENT_WITH_TASKS: eventName and startTime.
                - location is optional; ask if helpful, or set locationSkipped=true when the user has no location.
                - tasks are optional. If the user asks to create an event but has not provided tasks, ask whether they want to
                  enter tasks themselves, let AI suggest a task checklist, or skip tasks. Do not add suggested tasks until the
                  user asks for help/suggestions or says they do not know what tasks are needed.
                - When the user asks for task suggestions/help, include 5-8 practical tasks in the draft. Do not create only
                  one task unless the user clearly asked for one task.
                - When the user wants no tasks, set tasksSkipped=true.
                - Required for CREATE_TASKS_FOR_EVENT: targetEventId and at least one task.
                - Task title must be actionable Vietnamese. Description should be concise and practical.
                - Deadline must be ISO local datetime if known; infer sensible deadlines before event start when possible.
                - When required action data is missing, reply with a natural follow-up question.
                - When the draft is ready, summarize the event and all suggested tasks, then ask the user to confirm.
                - If the user says "tạo luôn", "cứ tạo đi", "tạo các task này", "lưu lại", or equivalent and the draft is ready,
                  keep readyToConfirm=true; the server may execute immediately.
                - Set readyToConfirm=true only when the draft is ready for server execution.
                - Never set completed=true; only the server sets completed after execution.

                Return only one JSON object with this shape:
                {
                  "reply": "Vietnamese message shown to the user",
                  "draft": {
                    "intent": null | "CREATE_EVENT_WITH_TASKS" | "CREATE_TASKS_FOR_EVENT",
                    "step": null | "eventName" | "startTime" | "location" | "tasks" | "confirm" | "targetEvent",
                    "targetEventId": number | null,
                    "eventName": string | null,
                    "eventDescription": string | null,
                    "location": string | null,
                    "startTime": "YYYY-MM-DDTHH:mm:ss" | null,
                    "locationSkipped": boolean,
                    "tasksSkipped": boolean,
                    "tasks": [{"title": string, "description": string, "deadline": "YYYY-MM-DDTHH:mm:ss" | null}]
                  },
                  "readyToConfirm": boolean,
                  "completed": false,
                  "createdEvent": null,
                  "targetEventId": number | null,
                  "createdTaskCount": 0
                }
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
