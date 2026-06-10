package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanningResponseDTO {
    private Long id;
    private Long eventId;
    private String title;
    private String description;
    private Long createdByUserId;
    private String createdByName;
    private List<PlanningPhaseResponseDTO> phases;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
