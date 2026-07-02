package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class LeaderSnapshotResponse {
    private EventBrief eventBrief;
    private Integer overallProgress;
    private Integer readinessScore;
    private String riskLevel;
    private SnapshotMetrics metrics;
    private List<CriticalItem> overdueItems;
    private List<CriticalItem> criticalItems;
    private List<CriticalItem> priorityItems;
    private List<MilestoneProgress> milestoneProgress;
    private List<PhaseProgress> phaseProgress;
    private List<RiskBucket> riskByDepartment;
    private List<RiskBucket> riskByCategory;
    private List<QuickAction> quickActions;
    private LocalDateTime generatedAt;

    @Data
    @Builder
    public static class EventBrief {
        private Long id;
        private String name;
        private String description;
        private String location;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private String status;
        private String eventType;
        private String objective;
        private Integer expectedAttendees;
        private String scale;
        private String contextDescription;
    }

    @Data
    @Builder
    public static class SnapshotMetrics {
        private Long totalTasks;
        private Long completedTasks;
        private Long overdueTasks;
        private Long dueSoonTasks;
        private Long urgentOpenTasks;
        private Long highPriorityOpenTasks;
        private Long unassignedTasks;
        private Long inReviewTasks;
        private Long reportCount;
        private Long reviewCount;
        private Long calendarItemCount;
        private Long departmentCount;
        private Integer daysUntilEvent;
    }

    @Data
    @Builder
    public static class CriticalItem {
        private Long taskId;
        private String title;
        private String status;
        private String priority;
        private LocalDateTime deadline;
        private Long departmentId;
        private String departmentName;
        private Long milestoneId;
        private String milestoneName;
        private Long assigneeId;
        private String assigneeName;
        private String reason;
        private Integer riskScore;
    }

    @Data
    @Builder
    public static class MilestoneProgress {
        private Long milestoneId;
        private String name;
        private LocalDateTime expectedDeadline;
        private Long totalTasks;
        private Long completedTasks;
        private Long overdueTasks;
        private Long openTasks;
        private Integer progress;
    }

    @Data
    @Builder
    public static class PhaseProgress {
        private String phase;
        private String label;
        private String basis;
        private Long totalTasks;
        private Long completedTasks;
        private Long overdueTasks;
        private Integer progress;
    }

    @Data
    @Builder
    public static class RiskBucket {
        private String key;
        private String label;
        private Long totalTasks;
        private Long completedTasks;
        private Long overdueTasks;
        private Long dueSoonTasks;
        private Long urgentOpenTasks;
        private Long unassignedTasks;
        private Integer progress;
        private Integer riskScore;
        private String riskLevel;
    }

    @Data
    @Builder
    public static class QuickAction {
        private String type;
        private String label;
        private String description;
        private String path;
        private String severity;
    }
}

