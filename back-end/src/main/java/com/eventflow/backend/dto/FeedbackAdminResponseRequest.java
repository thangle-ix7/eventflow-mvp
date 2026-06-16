package com.eventflow.backend.dto;

import com.eventflow.backend.entity.FeedbackStatus;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FeedbackAdminResponseRequest {
    private FeedbackStatus status;

    @Size(max = 4000, message = "Nội dung phản hồi không được vượt quá 4000 ký tự")
    private String responseMessage;
}
