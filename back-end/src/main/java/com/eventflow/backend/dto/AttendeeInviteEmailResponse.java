package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AttendeeInviteEmailResponse {
    private int requestedCount;
    private int sentCount;
    private int skippedCount;
    private List<String> errors;
}
