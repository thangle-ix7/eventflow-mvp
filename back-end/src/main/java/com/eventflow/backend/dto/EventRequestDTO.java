package com.eventflow.backend.dto;

import com.eventflow.backend.entity.EventNature;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventRequestDTO {

    @NotBlank(message = "Tên sự kiện không được để trống")
    @Size(max = 255, message = "Tên sự kiện không được vượt quá 255 ký tự")
    private String name;

    @Size(max = 2000, message = "Mô tả không được vượt quá 2000 ký tự")
    private String description;

    @Size(max = 255, message = "Địa điểm không được vượt quá 255 ký tự")
    private String location;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private LocalDateTime eventDate;

    @Size(max = 50, message = "Trạng thái không được vượt quá 50 ký tự")
    private String status;

    private EventNature nature;

    @Size(max = 2000, message = "Bối cảnh sự kiện không được vượt quá 2000 ký tự")
    private String contextDescription;

    @Size(max = 50, message = "Loại sự kiện không được vượt quá 50 ký tự")
    private String eventType;

    @Size(max = 2000, message = "Mục tiêu sự kiện không được vượt quá 2000 ký tự")
    private String objective;

    private Integer expectedAttendees;

    @Size(max = 100, message = "Quy mô sự kiện không được vượt quá 100 ký tự")
    private String scale;
}
