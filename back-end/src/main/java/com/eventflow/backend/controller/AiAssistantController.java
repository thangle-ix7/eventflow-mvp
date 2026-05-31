package com.eventflow.backend.controller;

import com.eventflow.backend.dto.AiChatRequest;
import com.eventflow.backend.dto.AiChatResponse;
import com.eventflow.backend.service.AiAssistantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/ai", "/api/v1/ai"})
@RequiredArgsConstructor
public class AiAssistantController {

    private final AiAssistantService aiAssistantService;

    @PostMapping("/chat")
    public ResponseEntity<AiChatResponse> chat(
            @Valid @RequestBody AiChatRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(aiAssistantService.chat(request, (Long) authentication.getPrincipal()));
    }
}
