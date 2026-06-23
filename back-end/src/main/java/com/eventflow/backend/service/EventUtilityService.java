package com.eventflow.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.eventflow.backend.dto.CalendarAttendeeDTO;
import com.eventflow.backend.dto.CalendarDayDTO;
import com.eventflow.backend.dto.CalendarEventDTO;
import com.eventflow.backend.dto.CalendarMonthResponse;
import com.eventflow.backend.dto.DashboardPeriodComparisonDTO;
import com.eventflow.backend.dto.EventCalendarItemRequest;
import com.eventflow.backend.dto.EventDocumentDTO;
import com.eventflow.backend.dto.EventReportItemDTO;
import com.eventflow.backend.dto.EventReportSummaryDTO;
import com.eventflow.backend.dto.EventReportsResponse;
import com.eventflow.backend.dto.MetricComparisonDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class EventUtilityService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final NotificationWorkflowService notificationWorkflowService;

    public CalendarMonthResponse getCalendarMonth(Long eventId, Integer year, Integer month, Long userId, boolean leader) {
        YearMonth targetMonth = resolveMonth(year, month);
        LocalDate firstDay = targetMonth.atDay(1);
        LocalDate lastDay = targetMonth.atEndOfMonth();
        LocalDateTime from = firstDay.atStartOfDay();
        LocalDateTime toExclusive = lastDay.plusDays(1).atStartOfDay();
        EventBounds eventBounds = getEventBounds(eventId);
        LocalDateTime eventFrom = eventBounds.startDate().atStartOfDay();
        LocalDateTime eventToExclusive = eventBounds.endDate().plusDays(1).atStartOfDay();

        Map<LocalDate, List<CalendarEventDTO>> itemsByDay = new LinkedHashMap<>();
        for (LocalDate day = firstDay; !day.isAfter(lastDay); day = day.plusDays(1)) {
            itemsByDay.put(day, new ArrayList<>());
        }

        List<CalendarEventDTO> monthItems = new ArrayList<>();
        jdbcTemplate.query("""
                SELECT ce.id, ce.title, ce.description, ce.location, ce.type, ce.start_time, ce.end_time,
                       ce.all_day, ce.status, ce.meeting_url, ce.meeting_options, ce.recurrence_rule,
                       ce.department_id, d.name AS department_name,
                       ce.created_by, u.name AS creator_name
                FROM calendar_event ce
                LEFT JOIN departments d ON d.id = ce.department_id
                LEFT JOIN users u ON u.id = ce.created_by
                WHERE ce.event_id = ?
                  AND ce.deleted_at IS NULL
                  AND ce.start_time >= ?
                  AND ce.start_time < ?
                  AND ce.start_time >= ?
                  AND ce.start_time < ?
                  AND ce.end_time < ?
                  AND (
                    ? = TRUE
                    OR ce.department_id IS NULL
                    OR ce.department_id = (
                        SELECT em.department_id
                        FROM event_members em
                        WHERE em.event_id = ? AND em.user_id = ?
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM calendar_event_attendees cea
                        WHERE cea.calendar_event_id = ce.id AND cea.user_id = ?
                    )
                  )
                ORDER BY ce.start_time ASC, ce.id ASC
                """, rs -> {
            CalendarEventDTO item = mapCalendarEvent(rs, eventId);
            LocalDate date = item.getStartTime().toLocalDate();
            monthItems.add(item);
            itemsByDay.computeIfAbsent(date, ignored -> new ArrayList<>()).add(item);
        }, eventId, Timestamp.valueOf(from), Timestamp.valueOf(toExclusive), Timestamp.valueOf(eventFrom), Timestamp.valueOf(eventToExclusive), Timestamp.valueOf(eventToExclusive), leader, eventId, userId, userId);

        Map<Long, List<CalendarAttendeeDTO>> attendeesByCalendarId = loadAttendees(eventId, monthItems.stream()
                .map(CalendarEventDTO::getId)
                .toList());
        monthItems.forEach(item -> item.setAttendees(attendeesByCalendarId.getOrDefault(item.getId(), List.of())));

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

    public CalendarEventDTO createCalendarItem(Long eventId, Long creatorId, EventCalendarItemRequest request) {
        validateCalendarRequest(eventId, request);
        List<Long> attendeeIds = normalizeAttendeeIds(request.getAttendeeIds());
        assertAttendeesBelongToEvent(eventId, attendeeIds);

        Long id = jdbcTemplate.queryForObject("""
                INSERT INTO calendar_event (
                    event_id, department_id, created_by, title, description, location, type,
                    start_time, end_time, all_day, status, meeting_url, meeting_options, recurrence_rule
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?)
                RETURNING id
                """, Long.class,
                eventId,
                request.getDepartmentId(),
                creatorId,
                request.getTitle().trim(),
                normalizeOptionalText(request.getDescription()),
                normalizeOptionalText(request.getLocation()),
                normalizeCalendarType(request.getType()),
                Timestamp.valueOf(request.getStartTime()),
                Timestamp.valueOf(request.getEndTime()),
                request.getAllDay() != null ? request.getAllDay() : false,
                normalizeCalendarStatus(request.getStatus()),
                normalizeOptionalText(request.getMeetingUrl()),
                serializeMeetingOptions(request.getMeetingOptions()),
                normalizeOptionalText(request.getRecurrenceRule()));

        saveAttendees(id, attendeeIds);
        notificationWorkflowService.notifyCalendarCreated(
                eventId,
                request.getDepartmentId(),
                attendeeIds,
                id,
                creatorId,
                request.getTitle().trim(),
                request.getStartTime(),
                request.getEndTime());
        List<CalendarAttendeeDTO> attendees = loadAttendees(eventId, List.of(id)).getOrDefault(id, List.of());

        return CalendarEventDTO.builder()
                .id(id)
                .title(request.getTitle().trim())
                .type(normalizeCalendarType(request.getType()))
                .date(request.getStartTime().toLocalDate())
                .description(normalizeOptionalText(request.getDescription()))
                .location(normalizeOptionalText(request.getLocation()))
                .eventId(eventId)
                .departmentId(request.getDepartmentId())
                .createdBy(creatorId)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .allDay(request.getAllDay() != null ? request.getAllDay() : false)
                .status(normalizeCalendarStatus(request.getStatus()))
                .meetingUrl(normalizeOptionalText(request.getMeetingUrl()))
                .meetingOptions(request.getMeetingOptions())
                .recurrenceRule(normalizeOptionalText(request.getRecurrenceRule()))
                .attendees(attendees)
                .build();
    }

    public CalendarEventDTO updateCalendarItem(Long eventId, Long calendarItemId, Long updaterId, EventCalendarItemRequest request) {
        validateCalendarRequest(eventId, request);
        List<Long> attendeeIds = normalizeAttendeeIds(request.getAttendeeIds());
        assertAttendeesBelongToEvent(eventId, attendeeIds);

        int updated = jdbcTemplate.update("""
                UPDATE calendar_event
                SET department_id = ?,
                    title = ?,
                    description = ?,
                    location = ?,
                    type = ?,
                    start_time = ?,
                    end_time = ?,
                    all_day = ?,
                    status = ?,
                    meeting_url = ?,
                    meeting_options = CAST(? AS jsonb),
                    recurrence_rule = ?
                WHERE id = ? AND event_id = ? AND deleted_at IS NULL
                """,
                request.getDepartmentId(),
                request.getTitle().trim(),
                normalizeOptionalText(request.getDescription()),
                normalizeOptionalText(request.getLocation()),
                normalizeCalendarType(request.getType()),
                Timestamp.valueOf(request.getStartTime()),
                Timestamp.valueOf(request.getEndTime()),
                request.getAllDay() != null ? request.getAllDay() : false,
                normalizeCalendarStatus(request.getStatus()),
                normalizeOptionalText(request.getMeetingUrl()),
                serializeMeetingOptions(request.getMeetingOptions()),
                normalizeOptionalText(request.getRecurrenceRule()),
                calendarItemId,
                eventId);

        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lịch trong sự kiện này");
        }

        replaceAttendees(calendarItemId, attendeeIds);
        notificationWorkflowService.notifyCalendarUpdated(
                eventId,
                request.getDepartmentId(),
                attendeeIds,
                calendarItemId,
                updaterId,
                request.getTitle().trim(),
                request.getStartTime(),
                request.getEndTime());
        return getCalendarItem(eventId, calendarItemId);
    }

    public List<EventDocumentDTO> getEventDocuments(Long eventId, Long userId, boolean leader) {
        return jdbcTemplate.query("""
                SELECT ta.id, ta.task_id, ta.original_name, ta.content_type, ta.size_bytes,
                       ta.storage_provider, ta.storage_path, ta.created_at,
                       COALESCE(ta.visibility, 'TASK_ONLY') AS visibility,
                       t.title AS task_title,
                       t.assignee_id,
                       t.parent_id AS parent_task_id,
                       pt.title AS parent_task_title,
                       d.id AS department_id,
                       COALESCE(d.name, 'Chưa gán ban') AS department_name,
                       ta.uploader_id,
                       u.name AS uploader_name
                FROM task_attachments ta
                JOIN tasks t ON t.id = ta.task_id
                LEFT JOIN tasks pt ON pt.id = t.parent_id
                LEFT JOIN departments d ON d.id = t.department_id
                JOIN users u ON u.id = ta.uploader_id
                WHERE t.event_id = ?
                  AND (
                    ? = TRUE
                    OR ta.uploader_id = ?
                    OR (COALESCE(ta.visibility, 'TASK_ONLY') = 'TASK_ONLY' AND t.assignee_id = ?)
                    OR (
                        COALESCE(ta.visibility, 'TASK_ONLY') = 'DEPARTMENT'
                        AND t.department_id IS NOT NULL
                        AND t.department_id = (
                            SELECT em.department_id
                            FROM event_members em
                            WHERE em.event_id = ? AND em.user_id = ?
                        )
                    )
                    OR COALESCE(ta.visibility, 'TASK_ONLY') = 'EVENT_PUBLIC'
                  )
                ORDER BY d.name ASC NULLS LAST,
                         COALESCE(pt.title, t.title) ASC,
                         CASE WHEN t.parent_id IS NULL THEN 0 ELSE 1 END ASC,
                         t.title ASC,
                         ta.created_at DESC,
                         ta.id DESC
                """, (rs, rowNum) -> EventDocumentDTO.builder()
                .id(rs.getLong("id"))
                .taskId(rs.getLong("task_id"))
                .taskTitle(rs.getString("task_title"))
                .parentTaskId(readNullableLong(rs, "parent_task_id"))
                .parentTaskTitle(rs.getString("parent_task_title"))
                .subtask(readNullableLong(rs, "parent_task_id") != null)
                .departmentId(readNullableLong(rs, "department_id"))
                .departmentName(rs.getString("department_name"))
                .uploaderName(rs.getString("uploader_name"))
                .originalName(rs.getString("original_name"))
                .contentType(rs.getString("content_type"))
                .sizeBytes(rs.getLong("size_bytes"))
                .downloadUrl("LINK".equalsIgnoreCase(rs.getString("storage_provider"))
                        ? null
                        : "/api/task-attachments/" + rs.getLong("id") + "/download")
                .externalUrl("LINK".equalsIgnoreCase(rs.getString("storage_provider")) ? rs.getString("storage_path") : null)
                .attachmentType("LINK".equalsIgnoreCase(rs.getString("storage_provider")) ? "LINK" : "FILE")
                .visibility(rs.getString("visibility"))
                .canEdit(leader || userId.equals(rs.getLong("uploader_id")))
                .canDelete(leader || userId.equals(rs.getLong("uploader_id")))
                .canOpenTask(leader || (rs.getObject("assignee_id") != null && userId.equals(rs.getLong("assignee_id"))))
                .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
                .build(), eventId, leader, userId, userId, eventId, userId);
    }

    public EventReportsResponse getEventReports(Long eventId, LocalDate fromDate, LocalDate toDate, Long userId, boolean leader) {
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
                  AND (? = TRUE OR t.assignee_id = ? OR tr.reporter_id = ?)
                """, (rs, rowNum) -> EventReportSummaryDTO.builder()
                .totalReports(rs.getLong("total_reports"))
                .reportsWithImages(rs.getLong("reports_with_images"))
                .reportedTasks(rs.getLong("reported_tasks"))
                .averageReportedProgress(rs.getDouble("average_reported_progress"))
                .build(), eventId, Timestamp.valueOf(from), Timestamp.valueOf(toExclusive), leader, userId, userId);

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
                  AND (? = TRUE OR t.assignee_id = ? OR tr.reporter_id = ?)
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
        }, eventId, Timestamp.valueOf(from), Timestamp.valueOf(toExclusive), leader, userId, userId);

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
                WHERE event_id = ? AND parent_id IS NULL AND deadline >= CAST(? AS date) AND deadline < (CAST(? AS date) + INTERVAL '1 day')
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

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeCalendarType(String type) {
        if (type == null || type.isBlank()) {
            return "OTHER";
        }
        return type.trim().toUpperCase();
    }

    private String normalizeCalendarStatus(String status) {
        if (status == null || status.isBlank()) {
            return "SCHEDULED";
        }
        return status.trim().toUpperCase();
    }

    private void validateCalendarRequest(Long eventId, EventCalendarItemRequest request) {
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thời gian kết thúc phải sau thời gian bắt đầu");
        }
        if (request.getDepartmentId() != null && !departmentBelongsToEvent(eventId, request.getDepartmentId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ban không thuộc sự kiện này");
        }
        assertCalendarWithinEventDateRange(eventId, request.getStartTime(), request.getEndTime());
    }

    private void assertCalendarWithinEventDateRange(Long eventId, LocalDateTime startTime, LocalDateTime endTime) {
        EventBounds bounds = getEventBounds(eventId);
        LocalDate startDate = startTime.toLocalDate();
        LocalDate endDate = endTime.toLocalDate();
        if (startDate.isBefore(bounds.startDate()) || endDate.isAfter(bounds.endDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lịch phải nằm trong ngày bắt đầu và ngày kết thúc sự kiện");
        }
    }

    private EventBounds getEventBounds(Long eventId) {
        return jdbcTemplate.queryForObject("""
                SELECT event_date, COALESCE(end_time, event_date) AS end_time
                FROM events
                WHERE id = ?
                """, (rs, rowNum) -> {
            LocalDate startDate = rs.getTimestamp("event_date").toLocalDateTime().toLocalDate();
            LocalDate endDate = rs.getTimestamp("end_time").toLocalDateTime().toLocalDate();
            if (endDate.isBefore(startDate)) {
                endDate = startDate;
            }
            return new EventBounds(startDate, endDate);
        }, eventId);
    }

    private boolean departmentBelongsToEvent(Long eventId, Long departmentId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM departments WHERE id = ? AND event_id = ?",
                Integer.class,
                departmentId,
                eventId);
        return count != null && count > 0;
    }

    private List<Long> normalizeAttendeeIds(List<Long> attendeeIds) {
        if (attendeeIds == null || attendeeIds.isEmpty()) {
            return List.of();
        }
        Set<Long> uniqueIds = new LinkedHashSet<>();
        for (Long attendeeId : attendeeIds) {
            if (attendeeId != null) {
                uniqueIds.add(attendeeId);
            }
        }
        return new ArrayList<>(uniqueIds);
    }

    private void assertAttendeesBelongToEvent(Long eventId, List<Long> attendeeIds) {
        if (attendeeIds.isEmpty()) {
            return;
        }

        String placeholders = String.join(",", Collections.nCopies(attendeeIds.size(), "?"));
        List<Object> params = new ArrayList<>();
        params.add(eventId);
        params.addAll(attendeeIds);

        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM event_members
                WHERE event_id = ? AND user_id IN (%s)
                """.formatted(placeholders), Integer.class, params.toArray());

        if (count == null || count != attendeeIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Người tham gia phải là thành viên của sự kiện");
        }
    }

    private void saveAttendees(Long calendarEventId, List<Long> attendeeIds) {
        if (attendeeIds.isEmpty()) {
            return;
        }

        jdbcTemplate.batchUpdate("""
                INSERT INTO calendar_event_attendees (calendar_event_id, user_id)
                VALUES (?, ?)
                ON CONFLICT (calendar_event_id, user_id) DO NOTHING
                """, attendeeIds, attendeeIds.size(), (ps, attendeeId) -> {
            ps.setLong(1, calendarEventId);
            ps.setLong(2, attendeeId);
        });
    }

    private void replaceAttendees(Long calendarEventId, List<Long> attendeeIds) {
        jdbcTemplate.update("DELETE FROM calendar_event_attendees WHERE calendar_event_id = ?", calendarEventId);
        saveAttendees(calendarEventId, attendeeIds);
    }

    private CalendarEventDTO getCalendarItem(Long eventId, Long calendarItemId) {
        CalendarEventDTO item = jdbcTemplate.queryForObject("""
                SELECT ce.id, ce.title, ce.description, ce.location, ce.type, ce.start_time, ce.end_time,
                       ce.all_day, ce.status, ce.meeting_url, ce.meeting_options, ce.recurrence_rule,
                       ce.department_id, d.name AS department_name,
                       ce.created_by, u.name AS creator_name
                FROM calendar_event ce
                LEFT JOIN departments d ON d.id = ce.department_id
                LEFT JOIN users u ON u.id = ce.created_by
                WHERE ce.id = ? AND ce.event_id = ? AND ce.deleted_at IS NULL
                """, (rs, rowNum) -> mapCalendarEvent(rs, eventId), calendarItemId, eventId);

        item.setAttendees(loadAttendees(eventId, List.of(calendarItemId)).getOrDefault(calendarItemId, List.of()));
        return item;
    }

    private CalendarEventDTO mapCalendarEvent(ResultSet rs, Long eventId) throws SQLException {
        LocalDateTime startTime = rs.getTimestamp("start_time").toLocalDateTime();
        Timestamp endTimestamp = rs.getTimestamp("end_time");
        Long departmentId = rs.getObject("department_id") != null ? rs.getLong("department_id") : null;
        Long createdBy = rs.getObject("created_by") != null ? rs.getLong("created_by") : null;

        return CalendarEventDTO.builder()
                .id(rs.getLong("id"))
                .title(rs.getString("title"))
                .type(rs.getString("type"))
                .date(startTime.toLocalDate())
                .description(rs.getString("description"))
                .location(rs.getString("location"))
                .eventId(eventId)
                .departmentId(departmentId)
                .departmentName(rs.getString("department_name"))
                .createdBy(createdBy)
                .creatorName(rs.getString("creator_name"))
                .startTime(startTime)
                .endTime(endTimestamp != null ? endTimestamp.toLocalDateTime() : null)
                .allDay(rs.getBoolean("all_day"))
                .status(rs.getString("status"))
                .meetingUrl(rs.getString("meeting_url"))
                .meetingOptions(parseMeetingOptions(rs.getString("meeting_options")))
                .recurrenceRule(rs.getString("recurrence_rule"))
                .attendees(new ArrayList<>())
                .build();
    }

    private Map<Long, List<CalendarAttendeeDTO>> loadAttendees(Long eventId, List<Long> calendarEventIds) {
        if (calendarEventIds == null || calendarEventIds.isEmpty()) {
            return Map.of();
        }

        String placeholders = String.join(",", Collections.nCopies(calendarEventIds.size(), "?"));
        List<Object> params = new ArrayList<>();
        params.add(eventId);
        params.addAll(calendarEventIds);

        Map<Long, List<CalendarAttendeeDTO>> attendeesByCalendarId = new HashMap<>();
        jdbcTemplate.query("""
                SELECT cea.calendar_event_id,
                       u.id AS user_id,
                       u.name,
                       u.email,
                       CAST(em.role AS text) AS role,
                       em.department_id,
                       d.name AS department_name
                FROM calendar_event_attendees cea
                JOIN calendar_event ce ON ce.id = cea.calendar_event_id
                JOIN users u ON u.id = cea.user_id
                JOIN event_members em ON em.event_id = ce.event_id AND em.user_id = u.id
                LEFT JOIN departments d ON d.id = em.department_id
                WHERE ce.event_id = ? AND cea.calendar_event_id IN (%s)
                ORDER BY cea.calendar_event_id ASC, u.name ASC, u.id ASC
                """.formatted(placeholders), rs -> {
            Long calendarEventId = rs.getLong("calendar_event_id");
            Long departmentId = rs.getObject("department_id") != null ? rs.getLong("department_id") : null;
            attendeesByCalendarId.computeIfAbsent(calendarEventId, ignored -> new ArrayList<>()).add(CalendarAttendeeDTO.builder()
                    .userId(rs.getLong("user_id"))
                    .name(rs.getString("name"))
                    .email(rs.getString("email"))
                    .role(rs.getString("role"))
                    .departmentId(departmentId)
                    .departmentName(rs.getString("department_name"))
                    .build());
        }, params.toArray());
        return attendeesByCalendarId;
    }

    private String serializeMeetingOptions(Map<String, Object> meetingOptions) {
        if (meetingOptions == null || meetingOptions.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(meetingOptions);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "meetingOptions không hợp lệ");
        }
    }

    private Map<String, Object> parseMeetingOptions(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(value, new TypeReference<>() {
            });
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private LocalDate[] resolveRange(LocalDate fromDate, LocalDate toDate) {
        LocalDate resolvedTo = toDate != null ? toDate : LocalDate.now();
        LocalDate resolvedFrom = fromDate != null ? fromDate : resolvedTo.minusDays(30);
        if (resolvedFrom.isAfter(resolvedTo)) {
            return new LocalDate[]{resolvedTo, resolvedFrom};
        }
        return new LocalDate[]{resolvedFrom, resolvedTo};
    }

    private Long readNullableLong(ResultSet rs, String columnName) throws SQLException {
        long value = rs.getLong(columnName);
        return rs.wasNull() ? null : value;
    }

    private record PeriodStats(long totalTasks, long completedTasks, long overdueTasks, int progressPercentage) {
    }

    private record EventBounds(LocalDate startDate, LocalDate endDate) {
    }
}
