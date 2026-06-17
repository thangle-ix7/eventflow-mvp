package com.eventflow.backend.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MilestoneRequestDTO {

    @Size(max = 255, message = "Tên milestone không được vượt quá 255 ký tự")
    private String name;

    @Size(max = 2000, message = "Mô tả milestone không được vượt quá 2000 ký tự")
    private String description;

    private LocalDateTime expectedDeadline;

    @Size(max = 2000, message = "Kết quả kỳ vọng không được vượt quá 2000 ký tự")
    private String expectedResult;

    private String priority;

    private String status;
}
