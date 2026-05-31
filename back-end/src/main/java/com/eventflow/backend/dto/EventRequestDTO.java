package com.eventflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventRequestDTO {

    @NotBlank(message = "Tên sự kiện không được để trống")
    @Size(max = 255, message = "Tên sự kiện không được vượt quá 255 ký tự")
    private String name;

    @NotNull(message = "Ngày diễn ra sự kiện không được để trống")
    private LocalDateTime eventDate;

    @Size(max = 50, message = "Trạng thái không được vượt quá 50 ký tự")
    private String status;
}
