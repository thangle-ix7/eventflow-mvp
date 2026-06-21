package com.eventflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CheckInSessionRequest {
    @NotBlank(message = "Ten session check-in khong duoc de trong")
    @Size(max = 255, message = "Ten session check-in khong duoc vuot qua 255 ky tu")
    private String name;

    @Size(max = 255, message = "Dia diem check-in khong duoc vuot qua 255 ky tu")
    private String location;

    private LocalDateTime startsAt;

    private LocalDateTime endsAt;

    private Boolean active;
}