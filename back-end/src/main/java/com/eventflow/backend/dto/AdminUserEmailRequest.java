package com.eventflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserEmailRequest {

    @Size(max = 500, message = "Không được gửi quá 500 user mỗi lần")
    private List<Long> userIds;

    private boolean sendAll;

    @Size(max = 100, message = "Từ khóa tìm kiếm không được vượt quá 100 ký tự")
    private String search;

    @NotBlank(message = "Tiêu đề email không được để trống")
    @Size(max = 160, message = "Tiêu đề email không được vượt quá 160 ký tự")
    private String subject;

    @NotBlank(message = "Nội dung email không được để trống")
    @Size(max = 50000, message = "Nội dung email không được vượt quá 50000 ký tự")
    private String message;

    @Pattern(regexp = "TEXT|HTML", message = "Định dạng nội dung email không hợp lệ")
    private String contentType = "TEXT";
}
