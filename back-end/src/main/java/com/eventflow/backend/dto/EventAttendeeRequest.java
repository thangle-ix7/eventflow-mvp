package com.eventflow.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class EventAttendeeRequest {
    @NotBlank(message = "Ten khach moi khong duoc de trong")
    @Size(max = 255, message = "Ten khach moi khong duoc vuot qua 255 ky tu")
    private String fullName;

    @Email(message = "Email khach moi khong hop le")
    @Size(max = 150, message = "Email khach moi khong duoc vuot qua 150 ky tu")
    private String email;

    @Size(max = 30, message = "So dien thoai khong duoc vuot qua 30 ky tu")
    private String phone;

    private String attendeeType;

    private String status;

    private Long sessionId;

    @Size(max = 2000, message = "Ghi chu khong duoc vuot qua 2000 ky tu")
    private String note;
}
