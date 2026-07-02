package com.eventflow.backend.service;

import com.eventflow.backend.dto.DepartmentLeaderSnapshotResponse;
import com.eventflow.backend.dto.LeaderSnapshotResponse;
import com.eventflow.backend.dto.PageResponse;
import com.eventflow.backend.entity.Department;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.TaskPriority;
import com.eventflow.backend.repository.DepartmentRepository;
import com.eventflow.backend.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaderSnapshotService {

    private final EventRepository eventRepository;
    private final DepartmentRepository departmentRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public LeaderSnapshotResponse getLeaderSnapshot(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));

        MetricsRaw raw = loadMetrics(eventId);
        int overallProgress = percentage(raw.completedTasks(), raw.totalTasks());
        int readinessScore = calculateReadinessScore(eventId, raw);
        String riskLevel = resolveRiskLevel(readinessScore, raw, event);

        List<LeaderSnapshotResponse.CriticalItem> criticalItems = loadCriticalItems(eventId);
        List<LeaderSnapshotResponse.CriticalItem> overdueItems = criticalItems.stream()
                .filter(item -> "OVERDUE".equals(item.getReason()))
                .limit(5)
                .toList();

        List<LeaderSnapshotResponse.RiskBucket> riskByDepartment = loadRiskBuckets(eventId, RiskBucketMode.DEPARTMENT);
        List<LeaderSnapshotResponse.RiskBucket> riskByCategory = loadRiskBuckets(eventId, RiskBucketMode.CATEGORY);

        return LeaderSnapshotResponse.builder()
                .eventBrief(mapEventBrief(event))
                .overallProgress(overallProgress)
                .readinessScore(readinessScore)
                .riskLevel(riskLevel)
                .metrics(mapMetrics(raw, event))
                .overdueItems(overdueItems)
                .criticalItems(criticalItems.stream().limit(8).toList())
                .milestoneProgress(loadMilestoneProgress(eventId))
                .phaseProgress(loadPhaseProgress(eventId))
                .riskByDepartment(riskByDepartment)
                .riskByCategory(riskByCategory)
                .quickActions(buildQuickActions(eventId, raw, readinessScore, riskLevel))
                .generatedAt(LocalDateTime.now())
                .build();
    }

    @Transactional(readOnly = true)
    public PageResponse<LeaderSnapshotResponse.CriticalItem> getPriorityTasks(
            Long eventId,
            String priority,
            Long milestoneId,
            int page,
            int size) {

        if (!eventRepository.existsById(eventId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện");
        }

        TaskPriority parsedPriority = parsePriority(priority);
        validateMilestoneFilter(eventId, milestoneId);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 30);
        int offset = safePage * safeSize;
        String milestoneCondition = milestoneId != null ? " AND t.milestone_id = ?\n" : "";

        List<Object> countParams = new ArrayList<>();
        countParams.add(eventId);
        countParams.add(parsedPriority.name());
        if (milestoneId != null) {
            countParams.add(milestoneId);
        }

        Long total = jdbcTemplate.queryForObject(("""
                SELECT COUNT(t.id)
                FROM tasks t
                WHERE t.event_id = ?
                  AND t.parent_id IS NULL
                  AND t.status != 'DONE'
                  AND t.priority = ?
                """ + milestoneCondition), Long.class, countParams.toArray());

        List<Object> contentParams = new ArrayList<>();
        contentParams.add(eventId);
        contentParams.add(parsedPriority.name());
        if (milestoneId != null) {
            contentParams.add(milestoneId);
        }
        contentParams.add(safeSize);
        contentParams.add(offset);

        List<LeaderSnapshotResponse.CriticalItem> content = jdbcTemplate.query(("""
                SELECT
                    t.id,
                    t.title,
                    t.status,
                    t.priority,
                    t.deadline,
                    t.department_id,
                    COALESCE(d.name, 'Chưa gán ban') AS department_name,
                    t.milestone_id,
                    COALESCE(m.name, 'Chưa gán milestone') AS milestone_name,
                    t.assignee_id,
                    COALESCE(u.name, 'Chưa phân công') AS assignee_name,
                    CASE
                        WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 'OVERDUE'
                        WHEN t.deadline >= NOW() AND t.deadline < NOW() + INTERVAL '72 hours' AND t.status != 'DONE' THEN 'DUE_SOON'
                        WHEN t.assignee_id IS NULL AND t.status != 'DONE' THEN 'NO_OWNER'
                        ELSE 'OPEN'
                    END AS reason,
                    (
                        CASE t.priority WHEN 'URGENT' THEN 40 WHEN 'HIGH' THEN 30 WHEN 'MEDIUM' THEN 20 ELSE 10 END
                        + CASE WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 30 ELSE 0 END
                        + CASE WHEN t.deadline >= NOW() AND t.deadline < NOW() + INTERVAL '72 hours' AND t.status != 'DONE' THEN 12 ELSE 0 END
                        + CASE WHEN t.assignee_id IS NULL AND t.status != 'DONE' THEN 8 ELSE 0 END
                    ) AS risk_score
                FROM tasks t
                LEFT JOIN departments d ON d.id = t.department_id
                LEFT JOIN milestones m ON m.id = t.milestone_id
                LEFT JOIN users u ON u.id = t.assignee_id
                WHERE t.event_id = ?
                  AND t.parent_id IS NULL
                  AND t.status != 'DONE'
                  AND t.priority = ?
                """ + milestoneCondition + """
                ORDER BY
                    t.deadline ASC NULLS LAST,
                    risk_score DESC,
                    t.id ASC
                LIMIT ? OFFSET ?
                """), (rs, rowNum) -> mapCriticalItem(rs), contentParams.toArray());

        long totalElements = total != null ? total : 0;
        int totalPages = totalElements > 0 ? (int) Math.ceil((double) totalElements / safeSize) : 0;

        return PageResponse.<LeaderSnapshotResponse.CriticalItem>builder()
                .content(content)
                .page(safePage)
                .size(safeSize)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .first(safePage == 0)
                .last(totalPages == 0 || safePage >= totalPages - 1)
                .build();
    }

    private void validateMilestoneFilter(Long eventId, Long milestoneId) {
        if (milestoneId == null) {
            return;
        }

        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM milestones
                WHERE id = ? AND event_id = ?
                """, Integer.class, milestoneId, eventId);
        if (count == null || count == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "milestoneId không thuộc sự kiện");
        }
    }

    @Transactional(readOnly = true)
    public DepartmentLeaderSnapshotResponse getDepartmentLeaderSnapshot(Long eventId, Long departmentId) {
        Department department = departmentRepository.findByIdAndEventId(departmentId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ban tổ chức"));

        DepartmentBacklogRaw backlog = loadDepartmentBacklog(eventId, departmentId);
        List<LeaderSnapshotResponse.CriticalItem> criticalTasks = loadDepartmentCriticalItems(eventId, departmentId);
        List<LeaderSnapshotResponse.CriticalItem> overdueTasks = criticalTasks.stream()
                .filter(item -> "OVERDUE".equals(item.getReason()))
                .limit(5)
                .toList();
        List<LeaderSnapshotResponse.CriticalItem> dueSoonTasks = loadDepartmentDueSoonTasks(eventId, departmentId);

        return DepartmentLeaderSnapshotResponse.builder()
                .departmentBrief(mapDepartmentBrief(department))
                .backlog(mapDepartmentBacklog(backlog))
                .overdueCount(backlog.overdueTasks())
                .overdueTasks(overdueTasks)
                .dueSoonTasks(dueSoonTasks)
                .criticalTasks(criticalTasks.stream().limit(8).toList())
                .workload(loadDepartmentWorkload(eventId, departmentId))
                .memberStatus(loadDepartmentMemberStatus(eventId, departmentId))
                .quickActions(buildDepartmentQuickActions(eventId, departmentId, backlog))
                .generatedAt(LocalDateTime.now())
                .build();
    }

    private MetricsRaw loadMetrics(Long eventId) {
        return jdbcTemplate.queryForObject("""
                SELECT
                    COUNT(t.id) AS total_tasks,
                    COALESCE(SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END), 0) AS completed_tasks,
                    COALESCE(SUM(CASE WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS overdue_tasks,
                    COALESCE(SUM(CASE WHEN t.deadline >= NOW() AND t.deadline < NOW() + INTERVAL '72 hours' AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS due_soon_tasks,
                    COALESCE(SUM(CASE WHEN t.priority = 'URGENT' AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS urgent_open_tasks,
                    COALESCE(SUM(CASE WHEN t.priority IN ('HIGH', 'URGENT') AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS high_priority_open_tasks,
                    COALESCE(SUM(CASE WHEN t.assignee_id IS NULL AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS unassigned_tasks,
                    COALESCE(SUM(CASE WHEN t.status = 'IN_REVIEW' THEN 1 ELSE 0 END), 0) AS in_review_tasks,
                    (SELECT COUNT(*) FROM task_reports tr JOIN tasks rt ON rt.id = tr.task_id WHERE rt.event_id = ? AND rt.parent_id IS NULL) AS report_count,
                    (SELECT COUNT(*) FROM task_reviews rv JOIN tasks rvt ON rvt.id = rv.task_id WHERE rvt.event_id = ? AND rvt.parent_id IS NULL) AS review_count,
                    (SELECT COUNT(*) FROM calendar_event ce WHERE ce.event_id = ? AND ce.deleted_at IS NULL) AS calendar_item_count,
                    (SELECT COUNT(*) FROM departments d WHERE d.event_id = ?) AS department_count
                FROM tasks t
                WHERE t.event_id = ? AND t.parent_id IS NULL
                """, (rs, rowNum) -> new MetricsRaw(
                        rs.getLong("total_tasks"),
                        rs.getLong("completed_tasks"),
                        rs.getLong("overdue_tasks"),
                        rs.getLong("due_soon_tasks"),
                        rs.getLong("urgent_open_tasks"),
                        rs.getLong("high_priority_open_tasks"),
                        rs.getLong("unassigned_tasks"),
                        rs.getLong("in_review_tasks"),
                        rs.getLong("report_count"),
                        rs.getLong("review_count"),
                        rs.getLong("calendar_item_count"),
                        rs.getLong("department_count")
                ), eventId, eventId, eventId, eventId, eventId);
    }

    private int calculateReadinessScore(Long eventId, MetricsRaw raw) {
        if (raw.totalTasks() == 0) {
            return 0;
        }

        WeightedProgress weighted = jdbcTemplate.queryForObject("""
                SELECT
                    COALESCE(SUM(CASE t.priority
                        WHEN 'URGENT' THEN 5
                        WHEN 'HIGH' THEN 4
                        WHEN 'MEDIUM' THEN 2
                        ELSE 1
                    END), 0) AS total_weight,
                    COALESCE(SUM(CASE WHEN t.status = 'DONE' THEN
                        CASE t.priority
                            WHEN 'URGENT' THEN 5
                            WHEN 'HIGH' THEN 4
                            WHEN 'MEDIUM' THEN 2
                            ELSE 1
                        END
                    ELSE 0 END), 0) AS completed_weight
                FROM tasks t
                WHERE t.event_id = ? AND t.parent_id IS NULL
                """, (rs, rowNum) -> new WeightedProgress(
                        rs.getLong("total_weight"),
                        rs.getLong("completed_weight")
                ), eventId);

        int weightedScore = weighted.totalWeight() > 0
                ? (int) ((weighted.completedWeight() * 100L) / weighted.totalWeight())
                : 0;

        long penalty = raw.overdueTasks() * 8L
                + raw.urgentOpenTasks() * 5L
                + raw.unassignedTasks() * 3L
                + raw.dueSoonTasks() * 2L;

        return clamp((int) (weightedScore - penalty), 0, 100);
    }

    private String resolveRiskLevel(int readinessScore, MetricsRaw raw, Event event) {
        long daysUntilEvent = daysUntilEvent(event);
        if (raw.overdueTasks() > 0 || raw.urgentOpenTasks() > 0 || (daysUntilEvent <= 7 && readinessScore < 55)) {
            return "HIGH";
        }
        if (raw.dueSoonTasks() > 0 || raw.unassignedTasks() > 0 || readinessScore < 75) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private List<LeaderSnapshotResponse.CriticalItem> loadCriticalItems(Long eventId) {
        return jdbcTemplate.query("""
                SELECT
                    t.id,
                    t.title,
                    t.status,
                    t.priority,
                    t.deadline,
                    t.department_id,
                    COALESCE(d.name, 'Chưa gán ban') AS department_name,
                    t.milestone_id,
                    COALESCE(m.name, 'Chưa gán milestone') AS milestone_name,
                    t.assignee_id,
                    COALESCE(u.name, 'Chưa phân công') AS assignee_name,
                    CASE
                        WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 'OVERDUE'
                        WHEN t.priority = 'URGENT' AND t.status != 'DONE' THEN 'URGENT_OPEN'
                        WHEN t.assignee_id IS NULL AND t.status != 'DONE' THEN 'NO_OWNER'
                        WHEN t.deadline >= NOW() AND t.deadline < NOW() + INTERVAL '72 hours' AND t.status != 'DONE' THEN 'DUE_SOON'
                        ELSE 'HIGH_PRIORITY_OPEN'
                    END AS reason,
                    (
                        CASE WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 50 ELSE 0 END
                        + CASE t.priority WHEN 'URGENT' THEN 35 WHEN 'HIGH' THEN 24 WHEN 'MEDIUM' THEN 10 ELSE 4 END
                        + CASE WHEN t.assignee_id IS NULL AND t.status != 'DONE' THEN 12 ELSE 0 END
                        + CASE WHEN t.deadline >= NOW() AND t.deadline < NOW() + INTERVAL '72 hours' AND t.status != 'DONE' THEN 10 ELSE 0 END
                    ) AS risk_score
                FROM tasks t
                LEFT JOIN departments d ON d.id = t.department_id
                LEFT JOIN milestones m ON m.id = t.milestone_id
                LEFT JOIN users u ON u.id = t.assignee_id
                WHERE t.event_id = ?
                  AND t.parent_id IS NULL
                  AND t.status != 'DONE'
                  AND (
                    t.deadline < NOW()
                    OR t.priority IN ('HIGH', 'URGENT')
                    OR t.assignee_id IS NULL
                    OR (t.deadline >= NOW() AND t.deadline < NOW() + INTERVAL '72 hours')
                  )
                ORDER BY risk_score DESC, t.deadline ASC NULLS LAST, t.id ASC
                LIMIT 12
                """, (rs, rowNum) -> mapCriticalItem(rs), eventId);
    }

    private DepartmentBacklogRaw loadDepartmentBacklog(Long eventId, Long departmentId) {
        return jdbcTemplate.queryForObject("""
                SELECT
                    COUNT(t.id) AS total_tasks,
                    COALESCE(SUM(CASE WHEN t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS open_tasks,
                    COALESCE(SUM(CASE WHEN t.status = 'TODO' THEN 1 ELSE 0 END), 0) AS todo_tasks,
                    COALESCE(SUM(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 ELSE 0 END), 0) AS in_progress_tasks,
                    COALESCE(SUM(CASE WHEN t.status = 'IN_REVIEW' THEN 1 ELSE 0 END), 0) AS in_review_tasks,
                    COALESCE(SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END), 0) AS completed_tasks,
                    COALESCE(SUM(CASE WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS overdue_tasks,
                    COALESCE(SUM(CASE WHEN t.deadline >= NOW() AND t.deadline < NOW() + INTERVAL '72 hours' AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS due_soon_tasks,
                    COALESCE(SUM(CASE WHEN t.assignee_id IS NULL AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS unassigned_tasks,
                    COALESCE(SUM(CASE WHEN t.priority IN ('HIGH', 'URGENT') AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS high_priority_open_tasks
                FROM tasks t
                WHERE t.event_id = ? AND t.department_id = ? AND t.parent_id IS NULL
                """, (rs, rowNum) -> new DepartmentBacklogRaw(
                rs.getLong("total_tasks"),
                rs.getLong("open_tasks"),
                rs.getLong("todo_tasks"),
                rs.getLong("in_progress_tasks"),
                rs.getLong("in_review_tasks"),
                rs.getLong("completed_tasks"),
                rs.getLong("overdue_tasks"),
                rs.getLong("due_soon_tasks"),
                rs.getLong("unassigned_tasks"),
                rs.getLong("high_priority_open_tasks")
        ), eventId, departmentId);
    }

    private List<LeaderSnapshotResponse.CriticalItem> loadDepartmentCriticalItems(Long eventId, Long departmentId) {
        return jdbcTemplate.query("""
                SELECT
                    t.id,
                    t.title,
                    t.status,
                    t.priority,
                    t.deadline,
                    t.department_id,
                    COALESCE(d.name, 'Chưa gán ban') AS department_name,
                    t.milestone_id,
                    COALESCE(m.name, 'Chưa gán milestone') AS milestone_name,
                    t.assignee_id,
                    COALESCE(u.name, 'Chưa phân công') AS assignee_name,
                    CASE
                        WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 'OVERDUE'
                        WHEN t.priority = 'URGENT' AND t.status != 'DONE' THEN 'URGENT_OPEN'
                        WHEN t.assignee_id IS NULL AND t.status != 'DONE' THEN 'NO_OWNER'
                        WHEN t.deadline >= NOW() AND t.deadline < NOW() + INTERVAL '72 hours' AND t.status != 'DONE' THEN 'DUE_SOON'
                        ELSE 'HIGH_PRIORITY_OPEN'
                    END AS reason,
                    (
                        CASE WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 50 ELSE 0 END
                        + CASE t.priority WHEN 'URGENT' THEN 35 WHEN 'HIGH' THEN 24 WHEN 'MEDIUM' THEN 10 ELSE 4 END
                        + CASE WHEN t.assignee_id IS NULL AND t.status != 'DONE' THEN 12 ELSE 0 END
                        + CASE WHEN t.deadline >= NOW() AND t.deadline < NOW() + INTERVAL '72 hours' AND t.status != 'DONE' THEN 10 ELSE 0 END
                    ) AS risk_score
                FROM tasks t
                LEFT JOIN departments d ON d.id = t.department_id
                LEFT JOIN milestones m ON m.id = t.milestone_id
                LEFT JOIN users u ON u.id = t.assignee_id
                WHERE t.event_id = ?
                  AND t.department_id = ?
                  AND t.parent_id IS NULL
                  AND t.status != 'DONE'
                  AND (
                    t.deadline < NOW()
                    OR t.priority IN ('HIGH', 'URGENT')
                    OR t.assignee_id IS NULL
                    OR (t.deadline >= NOW() AND t.deadline < NOW() + INTERVAL '72 hours')
                  )
                ORDER BY risk_score DESC, t.deadline ASC NULLS LAST, t.id ASC
                LIMIT 12
                """, (rs, rowNum) -> mapCriticalItem(rs), eventId, departmentId);
    }

    private List<LeaderSnapshotResponse.CriticalItem> loadDepartmentDueSoonTasks(Long eventId, Long departmentId) {
        return jdbcTemplate.query("""
                SELECT
                    t.id,
                    t.title,
                    t.status,
                    t.priority,
                    t.deadline,
                    t.department_id,
                    COALESCE(d.name, 'Chưa gán ban') AS department_name,
                    t.milestone_id,
                    COALESCE(m.name, 'Chưa gán milestone') AS milestone_name,
                    t.assignee_id,
                    COALESCE(u.name, 'Chưa phân công') AS assignee_name,
                    'DUE_SOON' AS reason,
                    (
                        CASE t.priority WHEN 'URGENT' THEN 35 WHEN 'HIGH' THEN 24 WHEN 'MEDIUM' THEN 10 ELSE 4 END
                        + CASE WHEN t.assignee_id IS NULL THEN 12 ELSE 0 END
                        + 10
                    ) AS risk_score
                FROM tasks t
                LEFT JOIN departments d ON d.id = t.department_id
                LEFT JOIN milestones m ON m.id = t.milestone_id
                LEFT JOIN users u ON u.id = t.assignee_id
                WHERE t.event_id = ?
                  AND t.department_id = ?
                  AND t.parent_id IS NULL
                  AND t.status != 'DONE'
                  AND t.deadline >= NOW()
                  AND t.deadline < NOW() + INTERVAL '72 hours'
                ORDER BY t.deadline ASC, risk_score DESC, t.id ASC
                LIMIT 6
                """, (rs, rowNum) -> mapCriticalItem(rs), eventId, departmentId);
    }

    private List<LeaderSnapshotResponse.CriticalItem> loadPriorityItems(Long eventId) {
        return jdbcTemplate.query("""
                SELECT
                    t.id,
                    t.title,
                    t.status,
                    t.priority,
                    t.deadline,
                    t.department_id,
                    COALESCE(d.name, 'Chưa gán ban') AS department_name,
                    t.milestone_id,
                    COALESCE(m.name, 'Chưa gán milestone') AS milestone_name,
                    t.assignee_id,
                    COALESCE(u.name, 'Chưa phân công') AS assignee_name,
                    CASE
                        WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 'OVERDUE'
                        WHEN t.deadline >= NOW() AND t.deadline < NOW() + INTERVAL '72 hours' AND t.status != 'DONE' THEN 'DUE_SOON'
                        WHEN t.assignee_id IS NULL AND t.status != 'DONE' THEN 'NO_OWNER'
                        ELSE 'OPEN'
                    END AS reason,
                    (
                        CASE t.priority WHEN 'URGENT' THEN 40 WHEN 'HIGH' THEN 30 WHEN 'MEDIUM' THEN 20 ELSE 10 END
                        + CASE WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 30 ELSE 0 END
                        + CASE WHEN t.deadline >= NOW() AND t.deadline < NOW() + INTERVAL '72 hours' AND t.status != 'DONE' THEN 12 ELSE 0 END
                        + CASE WHEN t.assignee_id IS NULL AND t.status != 'DONE' THEN 8 ELSE 0 END
                    ) AS risk_score
                FROM tasks t
                LEFT JOIN departments d ON d.id = t.department_id
                LEFT JOIN milestones m ON m.id = t.milestone_id
                LEFT JOIN users u ON u.id = t.assignee_id
                WHERE t.event_id = ?
                  AND t.parent_id IS NULL
                  AND t.status != 'DONE'
                ORDER BY
                    CASE t.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
                    t.deadline ASC NULLS LAST,
                    risk_score DESC,
                    t.id ASC
                LIMIT 40
                """, (rs, rowNum) -> mapCriticalItem(rs), eventId);
    }

    private TaskPriority parsePriority(String priority) {
        if (priority == null || priority.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "priority không được để trống");
        }

        try {
            return TaskPriority.valueOf(priority.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "priority không hợp lệ", e);
        }
    }

    private List<LeaderSnapshotResponse.MilestoneProgress> loadMilestoneProgress(Long eventId) {
        return jdbcTemplate.query("""
                SELECT
                    m.id AS milestone_id,
                    m.name,
                    m.expected_deadline,
                    COUNT(t.id) AS total_tasks,
                    COALESCE(SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END), 0) AS completed_tasks,
                    COALESCE(SUM(CASE WHEN t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS open_tasks,
                    COALESCE(SUM(CASE WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS overdue_tasks
                FROM milestones m
                LEFT JOIN tasks t ON t.milestone_id = m.id
                    AND t.event_id = m.event_id
                    AND t.parent_id IS NULL
                WHERE m.event_id = ?
                GROUP BY m.id, m.name, m.expected_deadline
                ORDER BY m.expected_deadline ASC NULLS LAST, m.created_at ASC, m.id ASC
                """, (rs, rowNum) -> {
            long total = rs.getLong("total_tasks");
            long completed = rs.getLong("completed_tasks");
            return LeaderSnapshotResponse.MilestoneProgress.builder()
                    .milestoneId(rs.getLong("milestone_id"))
                    .name(rs.getString("name"))
                    .expectedDeadline(toLocalDateTime(rs, "expected_deadline"))
                    .totalTasks(total)
                    .completedTasks(completed)
                    .openTasks(rs.getLong("open_tasks"))
                    .overdueTasks(rs.getLong("overdue_tasks"))
                    .progress(percentage(completed, total))
                    .build();
        }, eventId);
    }

    private List<DepartmentLeaderSnapshotResponse.WorkloadItem> loadDepartmentWorkload(Long eventId, Long departmentId) {
        return jdbcTemplate.query("""
                SELECT
                    t.assignee_id,
                    COALESCE(u.name, 'Chưa phân công') AS assignee_name,
                    COUNT(t.id) AS total_tasks,
                    COALESCE(SUM(CASE WHEN t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS open_tasks,
                    COALESCE(SUM(CASE WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS overdue_tasks,
                    COALESCE(SUM(CASE WHEN t.priority IN ('HIGH', 'URGENT') AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS urgent_or_high_tasks
                FROM tasks t
                LEFT JOIN users u ON u.id = t.assignee_id
                WHERE t.event_id = ? AND t.department_id = ? AND t.parent_id IS NULL
                GROUP BY t.assignee_id, u.name
                ORDER BY open_tasks DESC, overdue_tasks DESC, assignee_name ASC
                """, (rs, rowNum) -> DepartmentLeaderSnapshotResponse.WorkloadItem.builder()
                .userId(readNullableLong(rs, "assignee_id"))
                .userName(rs.getString("assignee_name"))
                .totalTasks(rs.getLong("total_tasks"))
                .openTasks(rs.getLong("open_tasks"))
                .overdueTasks(rs.getLong("overdue_tasks"))
                .urgentOrHighTasks(rs.getLong("urgent_or_high_tasks"))
                .build(), eventId, departmentId);
    }

    private List<DepartmentLeaderSnapshotResponse.MemberStatus> loadDepartmentMemberStatus(Long eventId, Long departmentId) {
        return jdbcTemplate.query("""
                SELECT
                    u.id AS user_id,
                    u.name AS user_name,
                    u.email,
                    CASE WHEN d.leader_user_id = u.id THEN TRUE ELSE FALSE END AS is_leader,
                    CASE WHEN u.telegram_chat_id IS NOT NULL AND u.telegram_chat_id <> '' THEN TRUE ELSE FALSE END AS telegram_linked,
                    COALESCE(SUM(CASE WHEN t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS assigned_open_tasks,
                    COALESCE(SUM(CASE WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS overdue_tasks
                FROM event_members em
                JOIN users u ON u.id = em.user_id
                JOIN departments d ON d.id = em.department_id
                LEFT JOIN tasks t ON t.assignee_id = u.id
                    AND t.event_id = em.event_id
                    AND t.department_id = em.department_id
                    AND t.parent_id IS NULL
                WHERE em.event_id = ? AND em.department_id = ?
                GROUP BY u.id, u.name, u.email, d.leader_user_id, u.telegram_chat_id
                ORDER BY is_leader DESC, assigned_open_tasks DESC, u.name ASC
                """, (rs, rowNum) -> DepartmentLeaderSnapshotResponse.MemberStatus.builder()
                .userId(rs.getLong("user_id"))
                .userName(rs.getString("user_name"))
                .email(rs.getString("email"))
                .leader(rs.getBoolean("is_leader"))
                .telegramLinked(rs.getBoolean("telegram_linked"))
                .assignedOpenTasks(rs.getLong("assigned_open_tasks"))
                .overdueTasks(rs.getLong("overdue_tasks"))
                .build(), eventId, departmentId);
    }

    private List<LeaderSnapshotResponse.PhaseProgress> loadPhaseProgress(Long eventId) {
        return jdbcTemplate.query("""
                WITH event_bounds AS (
                    SELECT event_date, COALESCE(end_time, event_date) AS end_time
                    FROM events
                    WHERE id = ?
                ),
                phased_tasks AS (
                    SELECT
                        CASE
                            WHEN t.deadline IS NULL OR t.deadline < eb.event_date THEN 'PRE_EVENT'
                            WHEN t.deadline <= eb.end_time THEN 'DURING_EVENT'
                            ELSE 'POST_EVENT'
                        END AS phase,
                        t.status,
                        t.deadline
                    FROM tasks t
                    CROSS JOIN event_bounds eb
                    WHERE t.event_id = ? AND t.parent_id IS NULL
                )
                SELECT
                    phase,
                    COUNT(*) AS total_tasks,
                    COALESCE(SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END), 0) AS completed_tasks,
                    COALESCE(SUM(CASE WHEN deadline < NOW() AND status != 'DONE' THEN 1 ELSE 0 END), 0) AS overdue_tasks
                FROM phased_tasks
                GROUP BY phase
                """, (rs, rowNum) -> {
            long total = rs.getLong("total_tasks");
            String phase = rs.getString("phase");
            return LeaderSnapshotResponse.PhaseProgress.builder()
                    .phase(phase)
                    .label(phaseLabel(phase))
                    .basis("INFERRED_FROM_TASK_DEADLINE")
                    .totalTasks(total)
                    .completedTasks(rs.getLong("completed_tasks"))
                    .overdueTasks(rs.getLong("overdue_tasks"))
                    .progress(percentage(rs.getLong("completed_tasks"), total))
                    .build();
        }, eventId, eventId).stream()
                .sorted(Comparator.comparingInt(item -> phaseOrder(item.getPhase())))
                .toList();
    }

    private List<LeaderSnapshotResponse.RiskBucket> loadRiskBuckets(Long eventId, RiskBucketMode mode) {
        String keyExpression = mode == RiskBucketMode.DEPARTMENT
                ? "COALESCE(CAST(d.id AS TEXT), 'unassigned')"
                : "COALESCE(CAST(tc.id AS TEXT), 'uncategorized')";
        String labelExpression = mode == RiskBucketMode.DEPARTMENT
                ? "COALESCE(d.name, 'Chưa gán ban')"
                : "COALESCE(tc.name, 'Chưa phân loại')";

        String sql = """
                SELECT
                    %s AS key,
                    %s AS label,
                    COUNT(t.id) AS total_tasks,
                    COALESCE(SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END), 0) AS completed_tasks,
                    COALESCE(SUM(CASE WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS overdue_tasks,
                    COALESCE(SUM(CASE WHEN t.deadline >= NOW() AND t.deadline < NOW() + INTERVAL '72 hours' AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS due_soon_tasks,
                    COALESCE(SUM(CASE WHEN t.priority = 'URGENT' AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS urgent_open_tasks,
                    COALESCE(SUM(CASE WHEN t.assignee_id IS NULL AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS unassigned_tasks
                FROM tasks t
                LEFT JOIN departments d ON d.id = t.department_id
                LEFT JOIN task_categories tc ON tc.id = t.category_id
                WHERE t.event_id = ? AND t.parent_id IS NULL
                GROUP BY 1, 2
                ORDER BY total_tasks DESC, label ASC
                """.formatted(keyExpression, labelExpression);

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            long total = rs.getLong("total_tasks");
            long completed = rs.getLong("completed_tasks");
            long overdue = rs.getLong("overdue_tasks");
            long dueSoon = rs.getLong("due_soon_tasks");
            long urgent = rs.getLong("urgent_open_tasks");
            long unassigned = rs.getLong("unassigned_tasks");
            int riskScore = (int) Math.min(100, overdue * 35 + urgent * 25 + unassigned * 12 + dueSoon * 10);
            return LeaderSnapshotResponse.RiskBucket.builder()
                    .key(rs.getString("key"))
                    .label(rs.getString("label"))
                    .totalTasks(total)
                    .completedTasks(completed)
                    .overdueTasks(overdue)
                    .dueSoonTasks(dueSoon)
                    .urgentOpenTasks(urgent)
                    .unassignedTasks(unassigned)
                    .progress(percentage(completed, total))
                    .riskScore(riskScore)
                    .riskLevel(riskLevelFromScore(riskScore))
                    .build();
        }, eventId);
    }

    private List<LeaderSnapshotResponse.QuickAction> buildQuickActions(Long eventId, MetricsRaw raw, int readinessScore, String riskLevel) {
        List<LeaderSnapshotResponse.QuickAction> actions = new ArrayList<>();
        if (raw.departmentCount() == 0) {
            actions.add(action("CREATE_DEPARTMENT", "Tạo ban tổ chức", "Chưa có ban phụ trách để chia việc.", "/events/" + eventId + "/departments", "HIGH"));
        }
        if (raw.totalTasks() == 0) {
            actions.add(action("CREATE_TASK", "Tạo task đầu tiên", "Dashboard và snapshot cần task để đo tiến độ.", "/events/" + eventId + "/tasks/new", "HIGH"));
        }
        if (raw.unassignedTasks() > 0) {
            actions.add(action("ASSIGN_OWNER", "Gán người phụ trách", raw.unassignedTasks() + " task chưa có owner.", "/events/" + eventId + "/tasks", "HIGH"));
        }
        if (raw.overdueTasks() > 0) {
            actions.add(action("FIX_OVERDUE", "Xử lý task quá hạn", raw.overdueTasks() + " task đang quá hạn và có thể kéo rủi ro event lên cao.", "/events/" + eventId + "/tasks", "HIGH"));
        }
        if (raw.urgentOpenTasks() > 0) {
            actions.add(action("REVIEW_URGENT", "Rà soát task khẩn cấp", raw.urgentOpenTasks() + " task urgent chưa hoàn thành.", "/events/" + eventId + "/tasks", "HIGH"));
        }
        if (raw.calendarItemCount() == 0) {
            actions.add(action("ADD_CALENDAR", "Thêm lịch vận hành", "Chưa có calendar item để điều phối mốc setup/check-in/rehearsal.", "/events/" + eventId + "/calendar", "MEDIUM"));
        }
        if (raw.reportCount() == 0 && raw.totalTasks() > 0) {
            actions.add(action("REQUEST_REPORTS", "Yêu cầu cập nhật tiến độ", "Chưa có báo cáo task nào, leader khó biết tiến độ thực tế.", "/events/" + eventId + "/reports", "MEDIUM"));
        }
        if ("LOW".equals(riskLevel) && readinessScore >= 80) {
            actions.add(action("KEEP_MONITORING", "Tiếp tục theo dõi", "Event đang ổn. Duy trì nhịp review và cập nhật dashboard.", "/events/" + eventId + "/dashboard", "LOW"));
        }
        return actions.stream().limit(6).toList();
    }

    private LeaderSnapshotResponse.EventBrief mapEventBrief(Event event) {
        return LeaderSnapshotResponse.EventBrief.builder()
                .id(event.getId())
                .name(event.getName())
                .description(event.getDescription())
                .location(event.getLocation())
                .startTime(event.getEventDate())
                .endTime(event.getEndTime())
                .status(event.getStatus())
                .eventType(event.getEventType())
                .objective(event.getObjective())
                .expectedAttendees(event.getExpectedAttendees())
                .scale(event.getScale())
                .contextDescription(event.getContextDescription())
                .build();
    }

    private DepartmentLeaderSnapshotResponse.DepartmentBrief mapDepartmentBrief(Department department) {
        Event event = department.getEvent();
        return DepartmentLeaderSnapshotResponse.DepartmentBrief.builder()
                .eventId(event != null ? event.getId() : null)
                .eventName(event != null ? event.getName() : null)
                .departmentId(department.getId())
                .departmentName(department.getName())
                .leaderUserId(department.getLeader() != null ? department.getLeader().getId() : null)
                .leaderName(department.getLeader() != null ? department.getLeader().getName() : null)
                .memberCount(countDepartmentMembers(event != null ? event.getId() : null, department.getId()))
                .build();
    }

    private DepartmentLeaderSnapshotResponse.Backlog mapDepartmentBacklog(DepartmentBacklogRaw raw) {
        return DepartmentLeaderSnapshotResponse.Backlog.builder()
                .totalTasks(raw.totalTasks())
                .openTasks(raw.openTasks())
                .todoTasks(raw.todoTasks())
                .inProgressTasks(raw.inProgressTasks())
                .inReviewTasks(raw.inReviewTasks())
                .completedTasks(raw.completedTasks())
                .progress(percentage(raw.completedTasks(), raw.totalTasks()))
                .build();
    }

    private long countDepartmentMembers(Long eventId, Long departmentId) {
        if (eventId == null || departmentId == null) {
            return 0;
        }
        Long count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM event_members
                WHERE event_id = ? AND department_id = ?
                """, Long.class, eventId, departmentId);
        return count != null ? count : 0;
    }

    private LeaderSnapshotResponse.SnapshotMetrics mapMetrics(MetricsRaw raw, Event event) {
        return LeaderSnapshotResponse.SnapshotMetrics.builder()
                .totalTasks(raw.totalTasks())
                .completedTasks(raw.completedTasks())
                .overdueTasks(raw.overdueTasks())
                .dueSoonTasks(raw.dueSoonTasks())
                .urgentOpenTasks(raw.urgentOpenTasks())
                .highPriorityOpenTasks(raw.highPriorityOpenTasks())
                .unassignedTasks(raw.unassignedTasks())
                .inReviewTasks(raw.inReviewTasks())
                .reportCount(raw.reportCount())
                .reviewCount(raw.reviewCount())
                .calendarItemCount(raw.calendarItemCount())
                .departmentCount(raw.departmentCount())
                .daysUntilEvent((int) daysUntilEvent(event))
                .build();
    }

    private LeaderSnapshotResponse.QuickAction action(String type, String label, String description, String path, String severity) {
        return LeaderSnapshotResponse.QuickAction.builder()
                .type(type)
                .label(label)
                .description(description)
                .path(path)
                .severity(severity)
                .build();
    }

    private List<LeaderSnapshotResponse.QuickAction> buildDepartmentQuickActions(Long eventId, Long departmentId, DepartmentBacklogRaw raw) {
        List<LeaderSnapshotResponse.QuickAction> actions = new ArrayList<>();
        String taskPath = "/events/" + eventId + "/departments/" + departmentId + "/tasks";
        String memberPath = "/events/" + eventId + "/departments/" + departmentId + "/members";

        if (raw.totalTasks() == 0) {
            actions.add(action("CREATE_DEPARTMENT_TASK", "Tạo task cho ban", "Ban chưa có backlog để theo dõi tiến độ.", "/events/" + eventId + "/tasks/new?departmentId=" + departmentId, "HIGH"));
        }
        if (raw.unassignedTasks() > 0) {
            actions.add(action("ASSIGN_DEPARTMENT_OWNER", "Gán owner trong ban", raw.unassignedTasks() + " task chưa có người phụ trách.", taskPath, "HIGH"));
        }
        if (raw.overdueTasks() > 0) {
            actions.add(action("FIX_DEPARTMENT_OVERDUE", "Xử lý task quá hạn", raw.overdueTasks() + " task của ban đang quá hạn.", taskPath + "?status=TODO", "HIGH"));
        }
        if (raw.highPriorityOpenTasks() > 0) {
            actions.add(action("REVIEW_DEPARTMENT_PRIORITY", "Rà task ưu tiên cao", raw.highPriorityOpenTasks() + " task HIGH/URGENT chưa xong.", taskPath, "HIGH"));
        }
        if (raw.dueSoonTasks() > 0) {
            actions.add(action("CHECK_DUE_SOON", "Chốt task sát hạn", raw.dueSoonTasks() + " task đến hạn trong 72 giờ.", taskPath, "MEDIUM"));
        }
        actions.add(action("OPEN_MEMBERS", "Kiểm tra member", "Xem phân bổ người và trạng thái Telegram của ban.", memberPath, "LOW"));

        return actions.stream().limit(6).toList();
    }

    private LeaderSnapshotResponse.CriticalItem mapCriticalItem(ResultSet rs) throws SQLException {
        return LeaderSnapshotResponse.CriticalItem.builder()
                .taskId(rs.getLong("id"))
                .title(rs.getString("title"))
                .deadline(toLocalDateTime(rs, "deadline"))
                .departmentId(readNullableLong(rs, "department_id"))
                .departmentName(rs.getString("department_name"))
                .milestoneId(readNullableLong(rs, "milestone_id"))
                .milestoneName(rs.getString("milestone_name"))
                .assigneeId(readNullableLong(rs, "assignee_id"))
                .assigneeName(rs.getString("assignee_name"))
                .reason(rs.getString("reason"))
                .riskScore(rs.getInt("risk_score"))
                .build();
    }

    private int percentage(long completed, long total) {
        return total > 0 ? (int) ((completed * 100L) / total) : 0;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private long daysUntilEvent(Event event) {
        if (event.getEventDate() == null) {
            return 0;
        }
        return ChronoUnit.DAYS.between(LocalDate.now(), event.getEventDate().toLocalDate());
    }

    private String riskLevelFromScore(int score) {
        if (score >= 50) return "HIGH";
        if (score >= 20) return "MEDIUM";
        return "LOW";
    }

    private String phaseLabel(String phase) {
        return switch (phase) {
            case "PRE_EVENT" -> "Trước sự kiện";
            case "DURING_EVENT" -> "Trong sự kiện";
            case "POST_EVENT" -> "Sau sự kiện";
            default -> phase;
        };
    }

    private int phaseOrder(String phase) {
        return switch (phase) {
            case "PRE_EVENT" -> 1;
            case "DURING_EVENT" -> 2;
            case "POST_EVENT" -> 3;
            default -> 9;
        };
    }

    private LocalDateTime toLocalDateTime(ResultSet rs, String column) throws SQLException {
        var timestamp = rs.getTimestamp(column);
        return timestamp != null ? timestamp.toLocalDateTime() : null;
    }

    private Long readNullableLong(ResultSet rs, String column) throws SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private record MetricsRaw(
            long totalTasks,
            long completedTasks,
            long overdueTasks,
            long dueSoonTasks,
            long urgentOpenTasks,
            long highPriorityOpenTasks,
            long unassignedTasks,
            long inReviewTasks,
            long reportCount,
            long reviewCount,
            long calendarItemCount,
            long departmentCount
    ) {
    }

    private record DepartmentBacklogRaw(
            long totalTasks,
            long openTasks,
            long todoTasks,
            long inProgressTasks,
            long inReviewTasks,
            long completedTasks,
            long overdueTasks,
            long dueSoonTasks,
            long unassignedTasks,
            long highPriorityOpenTasks
    ) {
    }

    private record WeightedProgress(long totalWeight, long completedWeight) {
    }

    private enum RiskBucketMode {
        DEPARTMENT,
        CATEGORY
    }
}


