package com.eventflow.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlanningPhaseRequestDTO {

    @NotBlank(message = "Tên giai đoạn không được để trống")
    @Size(max = 255, message = "Tên giai đoạn không được vượt quá 255 ký tự")
    private String phaseName;

    @Size(max = 2000, message = "Mô tả giai đoạn không được vượt quá 2000 ký tự")
    private String description;

    @Size(max = 2000, message = "Mục tiêu giai đoạn không được vượt quá 2000 ký tự")
    private String objective;

    @Min(value = 0, message = "Thứ tự giai đoạn không được nhỏ hơn 0")
    private Integer orderIndex;
}
