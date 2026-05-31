package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiActionDraft {
    private String intent;
    private String step;
    private Long targetEventId;
    private String eventName;
    private String eventDescription;
    private String location;
    private LocalDateTime startTime;
    private Integer startYear;
    private Integer startMonth;
    private Integer startDay;
    private String startTimeOfDay;
    @Builder.Default
    private Boolean locationSkipped = false;
    @Builder.Default
    private Boolean tasksSkipped = false;
    @Builder.Default
    private List<AiTaskDraft> tasks = new ArrayList<>();
}
