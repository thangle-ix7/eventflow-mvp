package com.eventflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventCalendarItemRequest {

    @NotBlank(message = "Tiêu đề lịch không được để trống")
    @Size(max = 255, message = "Tiêu đề lịch không được vượt quá 255 ký tự")
    private String title;

    @Size(max = 2000, message = "Mô tả lịch không được vượt quá 2000 ký tự")
    private String description;

    @Size(max = 255, message = "Địa điểm không được vượt quá 255 ký tự")
    private String location;

    @Size(max = 50, message = "Loại lịch không được vượt quá 50 ký tự")
    private String type;

    private Long departmentId;

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    private LocalDateTime startTime;

    @NotNull(message = "Thời gian kết thúc không được để trống")
    private LocalDateTime endTime;

    private Boolean allDay;

    @Size(max = 20, message = "Trạng thái lịch không được vượt quá 20 ký tự")
    private String status;

    private String meetingUrl;

    private List<Long> attendeeIds;

    private Map<String, Object> meetingOptions;

    private String recurrenceRule;
}
