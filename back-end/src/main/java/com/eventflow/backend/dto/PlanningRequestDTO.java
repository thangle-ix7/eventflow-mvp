package com.eventflow.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlanningRequestDTO {

    @NotBlank(message = "Tên kế hoạch không được để trống")
    @Size(max = 255, message = "Tên kế hoạch không được vượt quá 255 ký tự")
    private String title;

    @Size(max = 2000, message = "Mô tả kế hoạch không được vượt quá 2000 ký tự")
    private String description;

    @Valid
    private List<PlanningPhaseRequestDTO> phases;
}
