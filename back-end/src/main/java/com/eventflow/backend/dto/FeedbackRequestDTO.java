package com.eventflow.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FeedbackRequestDTO {
    private Long eventId;

    @Size(max = 50, message = "Loại feedback không được vượt quá 50 ký tự")
    private String category;

    @NotBlank(message = "Nội dung feedback không được để trống")
    @Size(max = 4000, message = "Nội dung feedback không được vượt quá 4000 ký tự")
    private String message;

    private Boolean anonymous;

    private Boolean publicVisible;

    @Email(message = "Email phản hồi không hợp lệ")
    @Size(max = 100, message = "Email phản hồi không được vượt quá 100 ký tự")
    private String contactEmail;
}
