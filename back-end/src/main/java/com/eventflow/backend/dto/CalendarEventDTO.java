package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarEventDTO {
    private Long id;
    private String title;
    private String type; // EVENT, TASK_DEADLINE, TASK_MILESTONE
    private LocalDate date;
    private String description;
    private Long eventId;
    private Long taskId;
    private String taskStatus;
    private String taskPriority;
    private String assigneeName;
    private String departmentName;
}
