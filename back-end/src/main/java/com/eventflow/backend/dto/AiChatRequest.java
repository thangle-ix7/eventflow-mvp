package com.eventflow.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRequest {
    @NotBlank(message = "Tin nhắn không được để trống")
    private String message;

    @Valid
    private AiActionDraft draft;

    @Valid
    private AiPageContext context;

    @Valid
    private List<AiChatMessage> messages = new ArrayList<>();

    public AiChatRequest(String message, AiActionDraft draft, AiPageContext context) {
        this.message = message;
        this.draft = draft;
        this.context = context;
    }
}
