package com.eventflow.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiSuggestionRequest {

    @Size(max = 2000, message = "Yêu cầu gợi ý không được vượt quá 2000 ký tự")
    private String instruction;

    @Min(value = 1, message = "Số lượng gợi ý tối thiểu là 1")
    @Max(value = 20, message = "Số lượng gợi ý tối đa là 20")
    private Integer count;
}
