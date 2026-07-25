package com.eventflow.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminEmailSettingsRequest {
    @NotNull(message = "Trạng thái email notification không được để trống")
    private Boolean userEmailNotificationsEnabled;
}
