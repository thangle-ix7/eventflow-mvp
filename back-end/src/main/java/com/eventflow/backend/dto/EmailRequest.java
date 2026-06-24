package com.eventflow.backend.dto;

import com.eventflow.backend.util.EmailFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailRequest {

    @NotBlank(message = "Email không được để trống")
    @Pattern(regexp = EmailFormat.REGEX, message = EmailFormat.MESSAGE)
    @Size(max = 100, message = "Email không được vượt quá 100 ký tự")
    private String email;
}
