package com.eventflow.backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatResponse {
    @JsonAlias({"message", "content", "text"})
    private String reply;
    private AiActionDraft draft;
    private boolean readyToConfirm;
    private boolean completed;
    private EventResponseDTO createdEvent;
    private Long targetEventId;
    private int createdTaskCount;
}
