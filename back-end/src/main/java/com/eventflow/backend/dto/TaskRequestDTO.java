package com.eventflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskRequestDTO {

    @NotBlank(message = "Tiêu đề task không được để trống")
    @Size(max = 255, message = "Tiêu đề task không được vượt quá 255 ký tự")
    private String title;

    @Size(max = 2000, message = "Mô tả task không được vượt quá 2000 ký tự")
    private String description;

    private Long departmentId;

    private Long assigneeId;

    private Long milestoneId;

    private String status;

    private String priority;

    @NotNull(message = "Deadline không được để trống")
    private LocalDateTime deadline;

    @Min(value = 0, message = "Thời gian nhắc trước hạn không được nhỏ hơn 0 phút")
    @Max(value = 525600, message = "Thời gian nhắc trước hạn không được vượt quá 1 năm")
    private Integer reminderOffsetMinutes;

    @Min(value = 0, message = "Tiến độ không được nhỏ hơn 0")
    @Max(value = 100, message = "Tiến độ không được lớn hơn 100")
    private Integer progressPercentage;
}

