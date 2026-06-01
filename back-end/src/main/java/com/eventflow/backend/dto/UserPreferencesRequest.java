package com.eventflow.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferencesRequest {

    @Min(value = 1, message = "Số dòng mỗi trang không được nhỏ hơn 1")
    @Max(value = 100, message = "Số dòng mỗi trang không được lớn hơn 100")
    private Integer taskPageSize;
}
