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
public class CalendarDayDTO {
    private LocalDate date;
    private Integer dayOfMonth;
    private List<CalendarEventDTO> items;
    private boolean hasItems;
    private boolean isToday;
    private boolean isWeekend;
}
