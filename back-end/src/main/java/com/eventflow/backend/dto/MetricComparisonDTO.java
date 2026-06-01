package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MetricComparisonDTO {
    private Long currentValue;
    private Long previousValue;
    private Long delta;
    private Double deltaPercent;
}
