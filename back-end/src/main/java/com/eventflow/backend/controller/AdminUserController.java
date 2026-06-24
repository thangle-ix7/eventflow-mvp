package com.eventflow.backend.controller;

import com.eventflow.backend.dto.AdminUserEmailRequest;
import com.eventflow.backend.dto.AdminUserEmailResponse;
import com.eventflow.backend.dto.PageResponse;
import com.eventflow.backend.dto.UserProfileDTO;
import com.eventflow.backend.security.AdminSecurityService;
import com.eventflow.backend.service.AdminUserEmailService;
import com.eventflow.backend.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/admin/users", "/api/v1/admin/users"})
@RequiredArgsConstructor
public class AdminUserController {

    private final UserProfileService userProfileService;
    private final AdminUserEmailService adminUserEmailService;
    private final AdminSecurityService adminSecurityService;

    @GetMapping
    public ResponseEntity<PageResponse<UserProfileDTO>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) String search,
            Authentication authentication) {

        if (!adminSecurityService.canViewUsers(currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(userProfileService.getUsersForAdmin(page, size, sort, direction, search));
    }

    @PostMapping("/email")
    public ResponseEntity<AdminUserEmailResponse> sendEmail(
            @Valid @RequestBody AdminUserEmailRequest request,
            Authentication authentication) {

        if (!adminSecurityService.canSendUserEmails(currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(adminUserEmailService.sendEmail(request));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserProfileDTO> getUser(
            @PathVariable Long userId,
            Authentication authentication) {

        if (!adminSecurityService.canViewUsers(currentUserId(authentication))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(userProfileService.getUserForAdmin(userId));
    }

    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
