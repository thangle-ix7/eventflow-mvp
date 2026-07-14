package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserMetricsDTO {
    private long totalUsers;
    private long activeUsers;
    private long dailyActiveUsers;
    private long monthlyActiveUsers;
    private double dailyActiveOnTotalRatio;
    private double dauMauRatio;
    private LocalDate measuredDate;
    private LocalDate measuredMonth;
    private List<AdminUserActivityPointDTO> dailyActiveSeries;
    private List<AdminUserActivityPointDTO> monthlyActiveSeries;
}

