package com.eventflow.backend.service;

import com.eventflow.backend.dto.CategoryMetricDTO;
import com.eventflow.backend.dto.ChartPointDTO;
import com.eventflow.backend.dto.DashboardSummaryDTO;
import com.eventflow.backend.dto.DepartmentDashboardSummaryDTO;
import com.eventflow.backend.dto.DepartmentSummaryDTO;
import com.eventflow.backend.repository.DepartmentRepository;
import com.eventflow.backend.repository.DashboardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final DashboardRepository dashboardRepository;
    private final DepartmentRepository departmentRepository;
    private final JdbcTemplate jdbcTemplate;

    public DashboardSummaryDTO getEventDashboardSummary(Long eventId) {
        Long totalTasks = dashboardRepository.countTotalTasks(eventId);
        Long completedTasks = dashboardRepository.countCompletedTasks(eventId);
        Long overdueTasksCount = dashboardRepository.countOverdueTasks(eventId);
        Integer daysUntilEvent = dashboardRepository.getDaysUntilEvent(eventId);
        List<DashboardRepository.DepartmentSummaryProjection> deptProjections = dashboardRepository.getDepartmentSummaries(eventId);

        // Edge Case: Avoid division by zero
        int progressPercentage = (totalTasks != null && totalTasks > 0)
                ? (int) ((completedTasks * 100L) / totalTasks)
                : 0;

        List<DepartmentSummaryDTO> departmentSummaries = deptProjections.stream()
                .map(p -> DepartmentSummaryDTO.builder()
                        .departmentName(p.getDepartment_name())
                        .totalTasks(p.getTotal_tasks())
                        .overdueTasksCount(p.getOverdue_tasks_count())
                        .build())
                .collect(Collectors.toList());

        return DashboardSummaryDTO.builder()
                .totalTasks(totalTasks != null ? totalTasks : 0L)
                .completedTasks(completedTasks != null ? completedTasks : 0L)
                .progressPercentage(progressPercentage)
                .overdueTasksCount(overdueTasksCount != null ? overdueTasksCount : 0L)
                .daysUntilEvent(daysUntilEvent != null ? daysUntilEvent : 0)
                .departmentSummaries(departmentSummaries)
                .build();
    }

    public DepartmentDashboardSummaryDTO getDepartmentDashboardSummary(Long eventId, Long departmentId) {
        var department = departmentRepository.findByIdAndEventId(departmentId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ban"));

        Long totalTasks = countTasks(eventId, departmentId, null);
        Long completedTasks = countTasks(eventId, departmentId, "DONE");
        Long overdueTasksCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM tasks
                WHERE event_id = ? AND department_id = ? AND parent_id IS NULL AND deadline < NOW() AND status != 'DONE'
                """, Long.class, eventId, departmentId);

        int progressPercentage = totalTasks != null && totalTasks > 0
                ? (int) (((completedTasks != null ? completedTasks : 0L) * 100L) / totalTasks)
                : 0;

        return DepartmentDashboardSummaryDTO.builder()
                .departmentId(department.getId())
                .departmentName(department.getName())
                .totalTasks(totalTasks != null ? totalTasks : 0L)
                .completedTasks(completedTasks != null ? completedTasks : 0L)
                .progressPercentage(progressPercentage)
                .overdueTasksCount(overdueTasksCount != null ? overdueTasksCount : 0L)
                .assigneeSummaries(getDepartmentTasksByAssignee(eventId, departmentId))
                .build();
    }

    public List<ChartPointDTO> getEventTaskTrend(Long eventId) {
        return getEventTaskTrend(eventId, null, null);
    }

    public List<ChartPointDTO> getEventTaskTrend(Long eventId, LocalDate fromDate, LocalDate toDate) {
        return getTaskTrend(eventId, null, fromDate, toDate);
    }

    public List<ChartPointDTO> getDepartmentTaskTrend(Long eventId, Long departmentId) {
        return getDepartmentTaskTrend(eventId, departmentId, null, null);
    }

    public List<ChartPointDTO> getDepartmentTaskTrend(Long eventId, Long departmentId, LocalDate fromDate, LocalDate toDate) {
        assertDepartmentExists(eventId, departmentId);
        return getTaskTrend(eventId, departmentId, fromDate, toDate);
    }

    public List<CategoryMetricDTO> getEventTasksByDepartment(Long eventId) {
        return jdbcTemplate.query("""
                SELECT COALESCE(d.name, 'Chưa gán ban') AS label,
                       COUNT(t.id) AS total_tasks,
                       COALESCE(SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END), 0) AS completed_tasks,
                       COALESCE(SUM(CASE WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS overdue_tasks_count
                FROM tasks t
                LEFT JOIN departments d ON d.id = t.department_id
                WHERE t.event_id = ? AND t.parent_id IS NULL
                GROUP BY COALESCE(d.name, 'Chưa gán ban')
                ORDER BY total_tasks DESC, label ASC
                """, (rs, rowNum) -> CategoryMetricDTO.builder()
                .label(rs.getString("label"))
                .totalTasks(rs.getLong("total_tasks"))
                .completedTasks(rs.getLong("completed_tasks"))
                .overdueTasksCount(rs.getLong("overdue_tasks_count"))
                .build(), eventId);
    }

    public List<CategoryMetricDTO> getEventTasksByAssignee(Long eventId) {
        return jdbcTemplate.query("""
                SELECT COALESCE(u.name, 'Chưa phân công') AS label,
                       COUNT(t.id) AS total_tasks,
                       COALESCE(SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END), 0) AS completed_tasks,
                       COALESCE(SUM(CASE WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS overdue_tasks_count
                FROM tasks t
                LEFT JOIN users u ON u.id = t.assignee_id
                WHERE t.event_id = ? AND t.parent_id IS NULL
                GROUP BY COALESCE(u.name, 'Chưa phân công')
                ORDER BY total_tasks DESC, label ASC
                """, (rs, rowNum) -> CategoryMetricDTO.builder()
                .label(rs.getString("label"))
                .totalTasks(rs.getLong("total_tasks"))
                .completedTasks(rs.getLong("completed_tasks"))
                .overdueTasksCount(rs.getLong("overdue_tasks_count"))
                .build(), eventId);
    }

    public List<CategoryMetricDTO> getEventTasksByStatus(Long eventId) {
        return getEventTasksByStatus(eventId, null, null);
    }

    public List<CategoryMetricDTO> getEventTasksByStatus(Long eventId, LocalDate fromDate, LocalDate toDate) {
        return getTasksByStatus(eventId, null, fromDate, toDate);
    }

    public List<CategoryMetricDTO> getDepartmentTasksByAssignee(Long eventId, Long departmentId) {
        assertDepartmentExists(eventId, departmentId);
        return jdbcTemplate.query("""
                SELECT COALESCE(u.name, 'Chưa phân công') AS label,
                       COUNT(t.id) AS total_tasks,
                       COALESCE(SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END), 0) AS completed_tasks,
                       COALESCE(SUM(CASE WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 1 ELSE 0 END), 0) AS overdue_tasks_count
                FROM tasks t
                LEFT JOIN users u ON u.id = t.assignee_id
                WHERE t.event_id = ? AND t.department_id = ? AND t.parent_id IS NULL
                GROUP BY COALESCE(u.name, 'Chưa phân công')
                ORDER BY total_tasks DESC, label ASC
                """, (rs, rowNum) -> CategoryMetricDTO.builder()
                .label(rs.getString("label"))
                .totalTasks(rs.getLong("total_tasks"))
                .completedTasks(rs.getLong("completed_tasks"))
                .overdueTasksCount(rs.getLong("overdue_tasks_count"))
                .build(), eventId, departmentId);
    }

    public List<CategoryMetricDTO> getDepartmentTasksByStatus(Long eventId, Long departmentId) {
        return getDepartmentTasksByStatus(eventId, departmentId, null, null);
    }

    public List<CategoryMetricDTO> getDepartmentTasksByStatus(Long eventId, Long departmentId, LocalDate fromDate, LocalDate toDate) {
        assertDepartmentExists(eventId, departmentId);
        return getTasksByStatus(eventId, departmentId, fromDate, toDate);
    }

    private List<ChartPointDTO> getTaskTrend(Long eventId, Long departmentId, LocalDate fromDate, LocalDate toDate) {
        String departmentClause = departmentId == null ? "" : " AND h.department_id = ? ";
        String dateClause = fromDate == null || toDate == null ? "" : " AND h.changed_at >= CAST(? AS date) AND h.changed_at < (CAST(? AS date) + INTERVAL '1 day') ";
        Object[] params = buildTrendParams(eventId, departmentId, fromDate, toDate);

        return jdbcTemplate.query("""
                WITH event_start AS (
                    SELECT COALESCE(CAST(? AS date), DATE_TRUNC('day', event_date)::date) AS start_day,
                           CAST(? AS date) AS requested_end_day
                    FROM events
                    WHERE id = ?
                ),
                filtered_status_updates AS (
                    SELECT h.changed_at, h.status, t.deadline
                    FROM task_status_history h
                    JOIN tasks t ON t.id = h.task_id
                    WHERE h.event_id = ?
                    AND t.parent_id IS NULL
                    """ + departmentClause + """
                    """ + dateClause + """
                ),
                bounds AS (
                    SELECT
                        es.start_day,
                        GREATEST(
                            es.start_day,
                            COALESCE(es.requested_end_day, DATE_TRUNC('day', MAX(fsu.changed_at))::date, es.start_day)
                        ) AS end_day
                    FROM event_start es
                    LEFT JOIN filtered_status_updates fsu ON TRUE
                    GROUP BY es.start_day, es.requested_end_day
                ),
                days AS (
                    SELECT GENERATE_SERIES(start_day, end_day, INTERVAL '1 day')::date AS day
                    FROM bounds
                ),
                daily_counts AS (
                    SELECT DATE_TRUNC('day', changed_at)::date AS day,
                           COUNT(*) AS total_tasks,
                           COALESCE(SUM(CASE WHEN status = 'TODO' THEN 1 ELSE 0 END), 0) AS todo_tasks,
                           COALESCE(SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END), 0) AS in_progress_tasks,
                           COALESCE(SUM(CASE WHEN status = 'IN_REVIEW' THEN 1 ELSE 0 END), 0) AS in_review_tasks,
                           COALESCE(SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END), 0) AS completed_tasks,
                           COALESCE(SUM(CASE WHEN deadline < (DATE_TRUNC('day', changed_at)::date + INTERVAL '1 day') AND status != 'DONE' THEN 1 ELSE 0 END), 0) AS overdue_tasks
                    FROM filtered_status_updates
                    GROUP BY DATE_TRUNC('day', changed_at)::date
                )
                SELECT TO_CHAR(d.day, 'YYYY-MM-DD') AS label,
                       COALESCE(dc.total_tasks, 0) AS total_tasks,
                       COALESCE(dc.todo_tasks, 0) AS todo_tasks,
                       COALESCE(dc.in_progress_tasks, 0) AS in_progress_tasks,
                       COALESCE(dc.in_review_tasks, 0) AS in_review_tasks,
                       COALESCE(dc.completed_tasks, 0) AS completed_tasks,
                       COALESCE(dc.overdue_tasks, 0) AS overdue_tasks
                FROM days d
                LEFT JOIN daily_counts dc ON dc.day = d.day
                ORDER BY d.day
                """, (rs, rowNum) -> ChartPointDTO.builder()
                .label(rs.getString("label"))
                .totalTasks(rs.getLong("total_tasks"))
                .todoTasks(rs.getLong("todo_tasks"))
                .inProgressTasks(rs.getLong("in_progress_tasks"))
                .inReviewTasks(rs.getLong("in_review_tasks"))
                .completedTasks(rs.getLong("completed_tasks"))
                .overdueTasks(rs.getLong("overdue_tasks"))
                .build(), params);
    }

    private Object[] buildTrendParams(Long eventId, Long departmentId, LocalDate fromDate, LocalDate toDate) {
        java.util.ArrayList<Object> params = new java.util.ArrayList<>();
        params.add(fromDate);
        params.add(toDate);
        params.add(eventId);
        params.add(eventId);
        if (departmentId != null) {
            params.add(departmentId);
        }
        if (fromDate != null && toDate != null) {
            params.add(fromDate);
            params.add(toDate);
        }
        return params.toArray();
    }

    private List<CategoryMetricDTO> getTasksByStatus(Long eventId, Long departmentId, LocalDate fromDate, LocalDate toDate) {
        boolean hasDateRange = fromDate != null && toDate != null;
        String tableAlias = hasDateRange ? "h" : "t";
        String statusColumn = tableAlias + ".status";
        String departmentClause = departmentId == null ? "" : " AND " + tableAlias + ".department_id = ? ";
        String dateClause = hasDateRange ? " AND h.changed_at >= CAST(? AS date) AND h.changed_at < (CAST(? AS date) + 1) " : "";
        java.util.ArrayList<Object> params = new java.util.ArrayList<>();
        params.add(eventId);
        if (departmentId != null) {
            params.add(departmentId);
        }
        if (hasDateRange) {
            params.add(fromDate);
            params.add(toDate);
        }

        String sourceQuery = hasDateRange ? """
                SELECT h.status AS label,
                       COUNT(*) AS total_tasks
                FROM task_status_history h
                JOIN tasks t ON t.id = h.task_id
                WHERE h.event_id = ?
                AND t.parent_id IS NULL
                """ : """
                SELECT t.status AS label,
                       COUNT(*) AS total_tasks
                FROM tasks t
                WHERE t.event_id = ?
                AND t.parent_id IS NULL
                """;

        String groupedQuery = """
                SELECT label, total_tasks
                FROM (
                """ + sourceQuery + departmentClause + dateClause + " GROUP BY " + statusColumn + """
                ) status_counts
                ORDER BY CASE label
                    WHEN 'TODO' THEN 1
                    WHEN 'IN_PROGRESS' THEN 2
                    WHEN 'IN_REVIEW' THEN 3
                    WHEN 'DONE' THEN 4
                    ELSE 5
                END
                """;

        return jdbcTemplate.query(groupedQuery, (rs, rowNum) -> CategoryMetricDTO.builder()
                .label(rs.getString("label"))
                .totalTasks(rs.getLong("total_tasks"))
                .completedTasks(0L)
                .overdueTasksCount(0L)
                .build(), params.toArray());
    }

    private Long countTasks(Long eventId, Long departmentId, String status) {
        if (status == null) {
            return jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM tasks WHERE event_id = ? AND department_id = ? AND parent_id IS NULL",
                    Long.class,
                    eventId,
                    departmentId);
        }

        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM tasks WHERE event_id = ? AND department_id = ? AND parent_id IS NULL AND status = ?",
                Long.class,
                eventId,
                departmentId,
                status);
    }

    private void assertDepartmentExists(Long eventId, Long departmentId) {
        if (departmentRepository.findByIdAndEventId(departmentId, eventId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ban");
        }
    }
}
