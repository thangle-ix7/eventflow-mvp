package com.eventflow.backend.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CheckInRequest {
    private String qrToken;

    private Long attendeeId;

    @Size(max = 2000, message = "Ghi chu check-in khong duoc vuot qua 2000 ky tu")
    private String note;
}
