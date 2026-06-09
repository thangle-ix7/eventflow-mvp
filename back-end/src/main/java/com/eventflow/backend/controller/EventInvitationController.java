package com.eventflow.backend.controller;

import com.eventflow.backend.dto.EventInvitationConfirmResponse;
import com.eventflow.backend.dto.TokenRequest;
import com.eventflow.backend.service.EventMemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/event-invitations", "/api/v1/event-invitations"})
@RequiredArgsConstructor
public class EventInvitationController {

    private final EventMemberService eventMemberService;

    @PostMapping("/confirm")
    public ResponseEntity<EventInvitationConfirmResponse> confirmInvitation(@Valid @RequestBody TokenRequest request) {
        return ResponseEntity.ok(eventMemberService.confirmInvitation(request.getToken()));
    }
}
