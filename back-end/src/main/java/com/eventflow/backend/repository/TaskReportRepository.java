package com.eventflow.backend.repository;

import com.eventflow.backend.entity.TaskReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskReportRepository extends JpaRepository<TaskReport, Long> {

    @Query("""
            SELECT tr FROM TaskReport tr
            JOIN FETCH tr.task t
            JOIN FETCH tr.reporter r
            WHERE t.id = :taskId
            ORDER BY tr.createdAt DESC
            """)
    List<TaskReport> findAllByTaskIdWithReporter(@Param("taskId") Long taskId);

    @Query("""
            SELECT COALESCE(SUM(tr.imageSizeBytes), 0)
            FROM TaskReport tr
            WHERE tr.task.event.id = :eventId
              AND tr.imageStoragePath IS NOT NULL
              AND tr.imageStoragePath <> ''
            """)
    long sumImageSizeByEventId(@Param("eventId") Long eventId);

    @Query("""
            SELECT tr FROM TaskReport tr
            JOIN FETCH tr.task t
            JOIN FETCH t.event
            JOIN FETCH tr.reporter
            WHERE tr.id = :reportId
            """)
    Optional<TaskReport> findByIdWithDetails(@Param("reportId") Long reportId);
}
