package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
/**
 * Response workload tổng quan toàn event.
 * Dùng cho Event Leader.
 */
@Data
@Builder
public class EventWorkloadResponse {
    private Long eventId;
    private Long totalDepartments;
    private Long totalMembers;
    private Long totalAssignedTasks;
    private Double averageWorkloadScore;
    private Long overloadedDepartmentCount;
    private List<DepartmentWorkloadResponse> departments;
}