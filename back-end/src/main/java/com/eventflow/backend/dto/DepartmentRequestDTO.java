package com.eventflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentRequestDTO {

    @NotBlank(message = "Tên ban không được để trống")
    @Size(max = 100, message = "Tên ban không được vượt quá 100 ký tự")
    private String name;

    @Size(max = 1000, message = "Mô tả ban không được vượt quá 1000 ký tự")
    private String description;

    private Long leaderUserId;

    public DepartmentRequestDTO(String name) {
        this.name = name;
    }
}
