package com.eventflow.backend.dto;

import com.eventflow.backend.entity.EventNature;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventResponseDTO {
    private Long id;
    private String name;
    private String description;
    private String location;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime eventDate;
    private String status;
    private EventNature nature;
    private String contextDescription;
    private String eventType;
    private String objective;
    private Integer expectedAttendees;
    private String scale;
    private String role;
    private Long departmentId;
    private String departmentName;
    private LocalDateTime createdAt;
}
