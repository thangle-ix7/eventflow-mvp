package com.eventflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskReviewRequest {
    @NotBlank(message = "Feedback không được để trống")
    @Size(max = 2000, message = "Feedback không được vượt quá 2000 ký tự")
    private String feedback;

    @NotBlank(message = "Status mới không được để trống")
    private String status;
}
