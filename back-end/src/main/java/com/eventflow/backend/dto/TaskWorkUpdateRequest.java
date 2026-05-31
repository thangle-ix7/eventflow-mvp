package com.eventflow.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskWorkUpdateRequest {

    @NotBlank(message = "Trạng thái task không được để trống")
    private String status;

    @NotNull(message = "Tiến độ không được để trống")
    @Min(value = 0, message = "Tiến độ không được nhỏ hơn 0")
    @Max(value = 100, message = "Tiến độ không được lớn hơn 100")
    private Integer progressPercentage;
}
