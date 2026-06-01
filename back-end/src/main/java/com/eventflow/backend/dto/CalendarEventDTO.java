package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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
    private String location;
    private Long eventId;
    private Long departmentId;
    private String departmentName;
    private Long createdBy;
    private String creatorName;
    private Long taskId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Boolean allDay;
    private String status;
    private String meetingUrl;
    private Map<String, Object> meetingOptions;
    private String recurrenceRule;
    private List<CalendarAttendeeDTO> attendees;
    private String taskStatus;
    private String taskPriority;
    private String assigneeName;
}
