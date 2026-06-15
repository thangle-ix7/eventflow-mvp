package com.eventflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TemplateDepartmentRequestDTO {
    @NotBlank(message = "Tên phòng ban không được để trống")
    private String name;
    private String description;
}
