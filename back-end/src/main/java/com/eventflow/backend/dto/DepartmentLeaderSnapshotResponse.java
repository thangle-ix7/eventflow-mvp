package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class DepartmentLeaderSnapshotResponse {
    private DepartmentBrief departmentBrief;
    private Backlog backlog;
    private Long overdueCount;
    private List<LeaderSnapshotResponse.CriticalItem> overdueTasks;
    private List<LeaderSnapshotResponse.CriticalItem> dueSoonTasks;
    private List<LeaderSnapshotResponse.CriticalItem> criticalTasks;
    private List<WorkloadItem> workload;
    private List<MemberStatus> memberStatus;
    private List<LeaderSnapshotResponse.QuickAction> quickActions;
    private LocalDateTime generatedAt;

    @Data
    @Builder
    public static class DepartmentBrief {
        private Long eventId;
        private String eventName;
        private Long departmentId;
        private String departmentName;
        private Long leaderUserId;
        private String leaderName;
        private Long memberCount;
    }

    @Data
    @Builder
    public static class Backlog {
        private Long totalTasks;
        private Long openTasks;
        private Long todoTasks;
        private Long inProgressTasks;
        private Long inReviewTasks;
        private Long completedTasks;
        private Integer progress;
    }

    @Data
    @Builder
    public static class WorkloadItem {
        private Long userId;
        private String userName;
        private Long totalTasks;
        private Long openTasks;
        private Long overdueTasks;
        private Long urgentOrHighTasks;
    }

    @Data
    @Builder
    public static class MemberStatus {
        private Long userId;
        private String userName;
        private String email;
        private Boolean leader;
        private Boolean telegramLinked;
        private Long assignedOpenTasks;
        private Long overdueTasks;
    }
}
