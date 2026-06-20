package com.eventflow.backend.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventMemberBulkInviteRequestDTO {

    @NotEmpty(message = "Danh sách email không được để trống")
    @Size(max = 100, message = "Không được gửi quá 100 email mỗi lần")
    private List<String> emails;

    private String role;
}
