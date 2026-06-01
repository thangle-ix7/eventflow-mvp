package com.eventflow.backend.service;

import com.eventflow.backend.dto.CalendarDayDTO;
import com.eventflow.backend.dto.CalendarEventDTO;
import com.eventflow.backend.dto.CalendarMonthResponse;
import com.eventflow.backend.dto.DashboardPeriodComparisonDTO;
import com.eventflow.backend.dto.EventDocumentDTO;
import com.eventflow.backend.dto.EventReportItemDTO;
import com.eventflow.backend.dto.EventReportSummaryDTO;
import com.eventflow.backend.dto.EventReportsResponse;
import com.eventflow.backend.dto.MetricComparisonDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EventUtilityService {

    private final JdbcTemplate jdbcTemplate;

    public CalendarMonthResponse getCalendarMonth(Long eventId, Integer year, Integer month) {
        YearMonth targetMonth = resolveMonth(year, month);
        LocalDate firstDay = targetMonth.atDay(1);
        LocalDate lastDay = targetMonth.atEndOfMonth();
        LocalDateTime from = firstDay.atStartOfDay();
        LocalDateTime toExclusive = lastDay.plusDays(1).atStartOfDay();

        Map<LocalDate, List<CalendarEventDTO>> itemsByDay = new LinkedHashMap<>();
        for (LocalDate day = firstDay; !day.isAfter(lastDay); day = day.plusDays(1)) {
            itemsByDay.put(day, new ArrayList<>());
        }

        jdbcTemplate.query("""
                SELECT id, name, description, location, event_date
                FROM events
                WHERE id = ? AND event_date >= ? AND event_date < ?
                """, rs -> {
            LocalDate date = rs.getTimestamp("event_date").toLocalDateTime().toLocalDate();
            itemsByDay.computeIfAbsent(date, ignored -> new ArrayList<>()).add(CalendarEventDTO.builder()
                    .id(rs.getLong("id"))
                    .title(rs.getString("name"))
                    .type("EVENT")
                    .date(date)
                    .description(rs.getString("description"))
                    .eventId(eventId)
                    .departmentName(rs.getString("location"))
                    .build());
        }, eventId, Timestamp.valueOf(from), Timestamp.valueOf(toExclusive));

        jdbcTemplate.query("""
                SELECT t.id, t.title, t.description, t.deadline, t.status, t.priority,
                       COALESCE(d.name, 'Chưa gán ban') AS department_name,
                       COALESCE(u.name, 'Chưa phân công') AS assignee_name
                FROM tasks t
                LEFT JOIN departments d ON d.id = t.department_id
                LEFT JOIN users u ON u.id = t.assignee_id
                WHERE t.event_id = ? AND t.deadline >= ? AND t.deadline < ?
                ORDER BY t.deadline ASC, t.id ASC
                """, rs -> {
            LocalDate date = rs.getTimestamp("deadline").toLocalDateTime().toLocalDate();
            itemsByDay.computeIfAbsent(date, ignored -> new ArrayList<>()).add(CalendarEventDTO.builder()
                    .id(rs.getLong("id"))
                    .title(rs.getString("title"))
                    .type("TASK_DEADLINE")
                    .date(date)
                    .description(rs.getString("description"))
                    .eventId(eventId)
                    .taskId(rs.getLong("id"))
                    .taskStatus(rs.getString("status"))
                    .taskPriority(rs.getString("priority"))
                    .assigneeName(rs.getString("assignee_name"))
                    .departmentName(rs.getString("department_name"))
                    .build());
        }, eventId, Timestamp.valueOf(from), Timestamp.valueOf(toExclusive));

        LocalDate today = LocalDate.now();
        List<CalendarDayDTO> days = itemsByDay.entrySet().stream()
                .map(entry -> CalendarDayDTO.builder()
                        .date(entry.getKey())
                        .dayOfMonth(entry.getKey().getDayOfMonth())
                        .items(entry.getValue())
                        .hasItems(!entry.getValue().isEmpty())
                        .isToday(entry.getKey().equals(today))
                        .isWeekend(entry.getKey().getDayOfWeek().getValue() >= 6)
                        .build())
                .toList();

        return CalendarMonthResponse.builder()
                .year(targetMonth.getYear())
                .month(targetMonth.getMonthValue())
                .days(days)
                .build();
    }

    public List<EventDocumentDTO> getEventDocuments(Long eventId) {
        return jdbcTemplate.query("""
                SELECT ta.id, ta.task_id, ta.original_name, ta.content_type, ta.size_bytes, ta.created_at,
                       t.title AS task_title,
                       COALESCE(d.name, 'Chưa gán ban') AS department_name,
                       u.name AS uploader_name
                FROM task_attachments ta
                JOIN tasks t ON t.id = ta.task_id
                LEFT JOIN departments d ON d.id = t.department_id
                JOIN users u ON u.id = ta.uploader_id
                WHERE t.event_id = ?
                ORDER BY ta.created_at DESC, ta.id DESC
                """, (rs, rowNum) -> EventDocumentDTO.builder()
                .id(rs.getLong("id"))
                .taskId(rs.getLong("task_id"))
                .taskTitle(rs.getString("task_title"))
                .departmentName(rs.getString("department_name"))
                .uploaderName(rs.getString("uploader_name"))
                .originalName(rs.getString("original_name"))
                .contentType(rs.getString("content_type"))
                .sizeBytes(rs.getLong("size_bytes"))
                .downloadUrl("/api/task-attachments/" + rs.getLong("id") + "/download")
                .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
                .build(), eventId);
    }

    public EventReportsResponse getEventReports(Long eventId, LocalDate fromDate, LocalDate toDate) {
        LocalDate[] range = resolveRange(fromDate, toDate);
        LocalDateTime from = range[0].atStartOfDay();
        LocalDateTime toExclusive = range[1].plusDays(1).atStartOfDay();

        EventReportSummaryDTO summary = jdbcTemplate.queryForObject("""
                SELECT COUNT(tr.id) AS total_reports,
                       COUNT(CASE WHEN tr.image_storage_path IS NOT NULL AND tr.image_storage_path <> '' THEN 1 END) AS reports_with_images,
                       COUNT(DISTINCT tr.task_id) AS reported_tasks,
                       COALESCE(AVG(tr.progress_percentage), 0) AS average_reported_progress
                FROM task_reports tr
                JOIN tasks t ON t.id = tr.task_id
                WHERE t.event_id = ? AND tr.created_at >= ? AND tr.created_at < ?
                """, (rs, rowNum) -> EventReportSummaryDTO.builder()
                .totalReports(rs.getLong("total_reports"))
                .reportsWithImages(rs.getLong("reports_with_images"))
                .reportedTasks(rs.getLong("reported_tasks"))
                .averageReportedProgress(rs.getDouble("average_reported_progress"))
                .build(), eventId, Timestamp.valueOf(from), Timestamp.valueOf(toExclusive));

        List<EventReportItemDTO> reports = jdbcTemplate.query("""
                SELECT tr.id, tr.task_id, tr.progress_percentage, tr.description, tr.image_storage_path,
                       tr.created_at, tr.updated_at,
                       t.title AS task_title, t.status AS task_status,
                       COALESCE(d.name, 'Chưa gán ban') AS department_name,
                       u.name AS reporter_name
                FROM task_reports tr
                JOIN tasks t ON t.id = tr.task_id
                LEFT JOIN departments d ON d.id = t.department_id
                JOIN users u ON u.id = tr.reporter_id
                WHERE t.event_id = ? AND tr.created_at >= ? AND tr.created_at < ?
                ORDER BY tr.created_at DESC, tr.id DESC
                """, (rs, rowNum) -> {
            Long reportId = rs.getLong("id");
            String imagePath = rs.getString("image_storage_path");
            boolean hasImage = imagePath != null && !imagePath.isBlank();
            return EventReportItemDTO.builder()
                    .id(reportId)
                    .taskId(rs.getLong("task_id"))
                    .taskTitle(rs.getString("task_title"))
                    .taskStatus(rs.getString("task_status"))
                    .departmentName(rs.getString("department_name"))
                    .reporterName(rs.getString("reporter_name"))
                    .progressPercentage(rs.getInt("progress_percentage"))
                    .description(rs.getString("description"))
                    .hasImage(hasImage)
                    .imageUrl(hasImage ? "/api/task-reports/" + reportId + "/image" : null)
                    .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
                    .updatedAt(rs.getTimestamp("updated_at").toLocalDateTime())
                    .build();
        }, eventId, Timestamp.valueOf(from), Timestamp.valueOf(toExclusive));

        return EventReportsResponse.builder()
                .fromDate(range[0])
                .toDate(range[1])
                .summary(summary)
                .reports(reports)
                .build();
    }

    public DashboardPeriodComparisonDTO getDashboardComparison(Long eventId, LocalDate fromDate, LocalDate toDate) {
        LocalDate[] range = resolveRange(fromDate, toDate);
        long days = ChronoUnit.DAYS.between(range[0], range[1]) + 1;
        LocalDate previousToDate = range[0].minusDays(1);
        LocalDate previousFromDate = previousToDate.minusDays(days - 1);

        PeriodStats current = getPeriodStats(eventId, range[0], range[1]);
        PeriodStats previous = getPeriodStats(eventId, previousFromDate, previousToDate);

        return DashboardPeriodComparisonDTO.builder()
                .fromDate(range[0])
                .toDate(range[1])
                .previousFromDate(previousFromDate)
                .previousToDate(previousToDate)
                .totalTasks(compare(current.totalTasks(), previous.totalTasks()))
                .completedTasks(compare(current.completedTasks(), previous.completedTasks()))
                .overdueTasks(compare(current.overdueTasks(), previous.overdueTasks()))
                .currentProgressPercentage(current.progressPercentage())
                .previousProgressPercentage(previous.progressPercentage())
                .progressDeltaPoints(current.progressPercentage() - previous.progressPercentage())
                .build();
    }

    private PeriodStats getPeriodStats(Long eventId, LocalDate fromDate, LocalDate toDate) {
        return jdbcTemplate.queryForObject("""
                SELECT COUNT(*) AS total_tasks,
                       COUNT(CASE WHEN status = 'DONE' THEN 1 END) AS completed_tasks,
                       COUNT(CASE WHEN deadline < NOW() AND status != 'DONE' THEN 1 END) AS overdue_tasks
                FROM tasks
                WHERE event_id = ? AND deadline >= CAST(? AS date) AND deadline < (CAST(? AS date) + INTERVAL '1 day')
                """, (rs, rowNum) -> {
            long totalTasks = rs.getLong("total_tasks");
            long completedTasks = rs.getLong("completed_tasks");
            int progressPercentage = totalTasks > 0 ? (int) ((completedTasks * 100L) / totalTasks) : 0;
            return new PeriodStats(
                    totalTasks,
                    completedTasks,
                    rs.getLong("overdue_tasks"),
                    progressPercentage);
        }, eventId, fromDate, toDate);
    }

    private MetricComparisonDTO compare(long current, long previous) {
        Double deltaPercent = previous > 0
                ? ((current - previous) * 100.0) / previous
                : (current > 0 ? 100.0 : 0.0);
        return MetricComparisonDTO.builder()
                .currentValue(current)
                .previousValue(previous)
                .delta(current - previous)
                .deltaPercent(deltaPercent)
                .build();
    }

    private YearMonth resolveMonth(Integer year, Integer month) {
        if (year != null && month != null) {
            return YearMonth.of(year, month);
        }
        return YearMonth.now();
    }

    private LocalDate[] resolveRange(LocalDate fromDate, LocalDate toDate) {
        LocalDate resolvedTo = toDate != null ? toDate : LocalDate.now();
        LocalDate resolvedFrom = fromDate != null ? fromDate : resolvedTo.minusDays(30);
        if (resolvedFrom.isAfter(resolvedTo)) {
            return new LocalDate[]{resolvedTo, resolvedFrom};
        }
        return new LocalDate[]{resolvedFrom, resolvedTo};
    }

    private record PeriodStats(long totalTasks, long completedTasks, long overdueTasks, int progressPercentage) {
    }
}
