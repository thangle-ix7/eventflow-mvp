package com.eventflow.backend.dto;

import com.eventflow.backend.entity.WorkloadStatus;
import lombok.Builder;
import lombok.Data;

/**
 * Response workload chi tiết của một member.
 * Dùng cho:
 * - Member xem workload cá nhân
 * - Leader xem workload của member trong event/department
 */
@Data
@Builder
public class MemberWorkloadResponse {

    private Long memberId;

    private String memberName;

    private Long departmentId;

    private String departmentName;

    /**
     * Số task chưa DONE đang được assign cho member.
     */
    private Long assignedTasks;

    /**
     * Số task đã DONE của member trong event.
     */
    private Long completedTasks;

    /**
     * Số task đang xử lý.
     * Trong MVP, inProgressTasks = assignedTasks vì đều là task chưa DONE.
     */
    private Long inProgressTasks;

    /**
     * Số task trung bình của các member trong scope.
     * Scope có thể là department hoặc toàn event.
     */
    private Double teamAverageAssignedTasks;

    /**
     * Công thức:
     * workloadScore = assignedTasks / teamAverageAssignedTasks * 100
     */
    private Double workloadScore;

    private WorkloadStatus workloadStatus;
}
