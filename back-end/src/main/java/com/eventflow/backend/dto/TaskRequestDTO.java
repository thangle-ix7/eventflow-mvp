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
public class TaskRequestDTO {

    @NotBlank(message = "Tiêu đề task không được để trống")
    @Size(max = 255, message = "Tiêu đề task không được vượt quá 255 ký tự")
    private String title;

    @NotNull(message = "departmentId không được để trống")
    private Long departmentId;

    private Long assigneeId;

    private String status;

    @NotNull(message = "Deadline không được để trống")
    private LocalDateTime deadline;
}
