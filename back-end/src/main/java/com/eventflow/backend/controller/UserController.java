package com.eventflow.backend.controller;

import com.eventflow.backend.dto.UserProfileDTO;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/{userId}")
    public ResponseEntity<UserProfileDTO> getProfile(
            @PathVariable Long userId,
            Authentication authentication) {

        Long authenticatedUserId = (Long) authentication.getPrincipal();
        if (!authenticatedUserId.equals(userId)) {
            return ResponseEntity.status(403).build();
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        return ResponseEntity.ok(new UserProfileDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getTelegramChatId()
        ));
    }
}
