package com.eventflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TemplateTaskRequestDTO {
    @NotBlank(message = "Tiêu đề task không được để trống")
    private String title;
    private String description;
    private Long departmentId;
    private String priority;
}
