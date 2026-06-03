package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentResponseDTO {
    private Long id;
    private Long eventId;
    private String name;
    private String description;
    private Long leaderUserId;
    private String leaderName;
    private String leaderEmail;
}
