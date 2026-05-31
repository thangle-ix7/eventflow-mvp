package com.eventflow.backend.repository;

import com.eventflow.backend.entity.Task;
import com.eventflow.backend.entity.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query("SELECT t FROM Task t JOIN FETCH t.assignee JOIN FETCH t.event WHERE t.status != com.eventflow.backend.entity.TaskStatus.DONE AND t.assignee IS NOT NULL")
    List<Task> findAllPendingTasksWithAssignees();

    @Query("SELECT t FROM Task t JOIN FETCH t.department LEFT JOIN FETCH t.assignee WHERE t.event.id = :eventId")
    List<Task> findAllByEventIdWithDetails(Long eventId);

    @Query("""
            SELECT t FROM Task t
            JOIN FETCH t.event
            JOIN FETCH t.department
            LEFT JOIN FETCH t.assignee
            WHERE t.event.id = :eventId
            AND (:status IS NULL OR t.status = :status)
            AND (:departmentId IS NULL OR t.department.id = :departmentId)
            AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId)
            AND (:search IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    List<Task> findAllByEventIdWithFilters(
            @Param("eventId") Long eventId,
            @Param("status") TaskStatus status,
            @Param("departmentId") Long departmentId,
            @Param("assigneeId") Long assigneeId,
            @Param("search") String search,
            org.springframework.data.domain.Sort sort);

    @Query(value = """
            SELECT t FROM Task t
            JOIN FETCH t.event
            JOIN FETCH t.department
            LEFT JOIN FETCH t.assignee
            WHERE t.event.id = :eventId
            AND (:status IS NULL OR t.status = :status)
            AND (:departmentId IS NULL OR t.department.id = :departmentId)
            AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId)
            AND (:search IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')))
            """,
            countQuery = """
            SELECT COUNT(t) FROM Task t
            WHERE t.event.id = :eventId
            AND (:status IS NULL OR t.status = :status)
            AND (:departmentId IS NULL OR t.department.id = :departmentId)
            AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId)
            AND (:search IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<Task> findPageByEventIdWithFilters(
            @Param("eventId") Long eventId,
            @Param("status") TaskStatus status,
            @Param("departmentId") Long departmentId,
            @Param("assigneeId") Long assigneeId,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT t FROM Task t JOIN FETCH t.event JOIN FETCH t.department LEFT JOIN FETCH t.assignee WHERE t.id = :taskId")
    Optional<Task> findByIdWithDetails(@Param("taskId") Long taskId);

    @Query("SELECT t.event.id FROM Task t WHERE t.id = :taskId")
    Optional<Long> findEventIdByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT COUNT(t) > 0 FROM Task t WHERE t.event.id = :eventId AND t.title = :title")
    boolean existsByEventIdAndTitle(@Param("eventId") Long eventId, @Param("title") String title);

    // Efficient check: does this task have the given user as assignee?
    @Query("SELECT COUNT(t) > 0 FROM Task t WHERE t.id = :taskId AND t.assignee.id = :userId")
    boolean existsByIdAndAssigneeId(@Param("taskId") Long taskId, @Param("userId") Long userId);
}
