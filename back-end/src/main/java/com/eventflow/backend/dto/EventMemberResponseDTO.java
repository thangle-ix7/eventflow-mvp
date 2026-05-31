package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventMemberResponseDTO {
    private Long id;
    private Long eventId;
    private Long userId;
    private String name;
    private String email;
    private String role;
    private LocalDateTime joinedAt;
}
