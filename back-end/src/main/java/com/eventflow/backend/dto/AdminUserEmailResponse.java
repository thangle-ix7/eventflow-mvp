package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserEmailResponse {
    private int requestedCount;
    private int sentCount;
    private int failedCount;
    private List<AdminUserEmailFailure> failures;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminUserEmailFailure {
        private Long userId;
        private String email;
        private String message;
    }
}
