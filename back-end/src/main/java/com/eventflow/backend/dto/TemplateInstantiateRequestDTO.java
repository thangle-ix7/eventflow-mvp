package com.eventflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TemplateInstantiateRequestDTO {

    @NotBlank(message = "Tên sự kiện không được để trống")
    @Size(max = 255, message = "Tên sự kiện không được vượt quá 255 ký tự")
    private String name;

    @Size(max = 2000, message = "Mô tả không được vượt quá 2000 ký tự")
    private String description;

    @Size(max = 255, message = "Địa điểm không được vượt quá 255 ký tự")
    private String location;

    @Size(max = 2000, message = "Bối cảnh sự kiện không được vượt quá 2000 ký tự")
    private String contextDescription;

    @Size(max = 50, message = "Loại sự kiện không được vượt quá 50 ký tự")
    private String eventType;

    @Size(max = 2000, message = "Mục tiêu sự kiện không được vượt quá 2000 ký tự")
    private String objective;

    private Integer expectedAttendees;

    @Size(max = 100, message = "Quy mô sự kiện không được vượt quá 100 ký tự")
    private String scale;

    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDateTime startTime;

    private LocalDateTime endTime;

    @NotNull(message = "Ngày sự kiện không được để trống")
    private LocalDateTime eventDate;
}
