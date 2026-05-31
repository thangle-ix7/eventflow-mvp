package com.eventflow.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}
