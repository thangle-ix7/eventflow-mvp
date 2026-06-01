package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarAttendeeDTO {
    private Long userId;
    private String name;
    private String email;
    private String role;
    private Long departmentId;
    private String departmentName;
}
