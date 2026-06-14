package com.eventflow.backend.dto;

import com.eventflow.backend.entity.WorkloadStatus;
import lombok.Builder;
import lombok.Data;
import java.util.List;
/**
 * Response workload tổng quan của một department.
 * Dùng cho Event Leader hoặc Department Leader.
 */
@Data
@Builder
public class DepartmentWorkloadResponse {
    private Long eventId;
    private Long departmentId;
    private String departmentName;
    private Long totalMembers;
    private Long totalAssignedTasks;
    private Double teamAverageAssignedTasks;
    private Double averageWorkloadScore;
    private Long overloadedMemberCount;
    private WorkloadStatus departmentWorkloadStatus;
    private List<MemberWorkloadResponse> members;
}