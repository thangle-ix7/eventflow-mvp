package com.eventflow.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DashboardRepository extends JpaRepository<com.eventflow.backend.entity.Event, Long> {

    // Get total tasks count for an event
    @Query(value = "SELECT COUNT(t) FROM tasks t WHERE t.event_id = :eventId AND t.parent_id IS NULL", nativeQuery = true)
    Long countTotalTasks(@Param("eventId") Long eventId);

    // Get completed tasks count for an event
    @Query(value = "SELECT COUNT(t) FROM tasks t WHERE t.event_id = :eventId AND t.parent_id IS NULL AND t.status = 'DONE'", nativeQuery = true)
    Long countCompletedTasks(@Param("eventId") Long eventId);

    // Get overdue tasks count for an event
    @Query(value = "SELECT COUNT(t) FROM tasks t WHERE t.event_id = :eventId AND t.parent_id IS NULL AND t.deadline < NOW() AND t.status != 'DONE'", nativeQuery = true)
    Long countOverdueTasks(@Param("eventId") Long eventId);

    // Get days until event (can be negative if event passed)
    @Query(value = "SELECT CAST(EXTRACT(DAY FROM (event_date - NOW())) AS INTEGER) FROM events WHERE id = :eventId", nativeQuery = true)
    Integer getDaysUntilEvent(@Param("eventId") Long eventId);

    // Get department summaries: name, total tasks, overdue tasks
    @Query(value = "SELECT " +
            "d.name AS department_name, " +
            "COUNT(t.id) AS total_tasks, " +
            "COUNT(CASE WHEN t.deadline < NOW() AND t.status != 'DONE' THEN 1 END) AS overdue_tasks_count " +
            "FROM departments d " +
            "LEFT JOIN tasks t ON t.department_id = d.id AND t.event_id = :eventId AND t.parent_id IS NULL " +
            "WHERE d.event_id = :eventId " +
            "GROUP BY d.id, d.name " +
            "ORDER BY d.name", nativeQuery = true)
    List<DepartmentSummaryProjection> getDepartmentSummaries(@Param("eventId") Long eventId);

    // Projection interface for department summary native query
    interface DepartmentSummaryProjection {
        String getDepartment_name();
        Long getTotal_tasks();
        Long getOverdue_tasks_count();
    }
}
