package com.eventflow.backend.repository;

import com.eventflow.backend.entity.Task;
import com.eventflow.backend.entity.TaskPriority;
import com.eventflow.backend.entity.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query("""
            SELECT t FROM Task t
            JOIN FETCH t.event
            LEFT JOIN FETCH t.parent
            LEFT JOIN FETCH t.assignee
            WHERE t.status != com.eventflow.backend.entity.TaskStatus.DONE
            AND t.status != com.eventflow.backend.entity.TaskStatus.IN_REVIEW
            """)
    List<Task> findAllPendingTasksForReminders();

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.department LEFT JOIN FETCH t.assignee WHERE t.event.id = :eventId AND t.parent IS NULL")
    List<Task> findAllByEventIdWithDetails(Long eventId);

    @Query("""
            SELECT t FROM Task t
            JOIN FETCH t.event
            LEFT JOIN FETCH t.parent
            LEFT JOIN FETCH t.department
            LEFT JOIN FETCH t.assignee
            WHERE t.event.id = :eventId
            AND t.parent IS NULL
            AND (:status IS NULL OR t.status = :status)
            AND (:priority IS NULL OR t.priority = :priority)
            AND (:departmentId IS NULL OR t.department.id = :departmentId)
            AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId)
            AND (:searchPattern IS NULL OR LOWER(t.title) LIKE :searchPattern OR LOWER(COALESCE(t.description, '')) LIKE :searchPattern)
            """)
    List<Task> findAllByEventIdWithFilters(
            @Param("eventId") Long eventId,
            @Param("status") TaskStatus status,
            @Param("priority") TaskPriority priority,
            @Param("departmentId") Long departmentId,
            @Param("assigneeId") Long assigneeId,
            @Param("searchPattern") String searchPattern,
            org.springframework.data.domain.Sort sort);

    @Query(value = """
            SELECT t FROM Task t
            JOIN FETCH t.event
            LEFT JOIN FETCH t.parent
            LEFT JOIN FETCH t.department
            LEFT JOIN FETCH t.assignee
            WHERE t.event.id = :eventId
            AND t.parent IS NULL
            AND (:status IS NULL OR t.status = :status)
            AND (:priority IS NULL OR t.priority = :priority)
            AND (:departmentId IS NULL OR t.department.id = :departmentId)
            AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId)
            AND (:searchPattern IS NULL OR LOWER(t.title) LIKE :searchPattern OR LOWER(COALESCE(t.description, '')) LIKE :searchPattern)
            """,
            countQuery = """
            SELECT COUNT(t) FROM Task t
            WHERE t.event.id = :eventId
            AND t.parent IS NULL
            AND (:status IS NULL OR t.status = :status)
            AND (:priority IS NULL OR t.priority = :priority)
            AND (:departmentId IS NULL OR t.department.id = :departmentId)
            AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId)
            AND (:searchPattern IS NULL OR LOWER(t.title) LIKE :searchPattern OR LOWER(COALESCE(t.description, '')) LIKE :searchPattern)
            """)
    Page<Task> findPageByEventIdWithFilters(
            @Param("eventId") Long eventId,
            @Param("status") TaskStatus status,
            @Param("priority") TaskPriority priority,
            @Param("departmentId") Long departmentId,
            @Param("assigneeId") Long assigneeId,
            @Param("searchPattern") String searchPattern,
            Pageable pageable);

    @Query(value = """
            SELECT t FROM Task t
            JOIN FETCH t.event
            LEFT JOIN FETCH t.parent
            LEFT JOIN FETCH t.department
            LEFT JOIN FETCH t.assignee
            WHERE t.event.id = :eventId
            AND t.parent IS NULL
            AND (:status IS NULL OR t.status = :status)
            AND (:priority IS NULL OR t.priority = :priority)
            AND (:departmentId IS NULL OR t.department.id = :departmentId)
            AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId)
            AND (:searchPattern IS NULL OR LOWER(t.title) LIKE :searchPattern OR LOWER(COALESCE(t.description, '')) LIKE :searchPattern)
            AND t.deadline >= :fromDateTime
            AND t.deadline < :toDateTime
            """,
            countQuery = """
            SELECT COUNT(t) FROM Task t
            WHERE t.event.id = :eventId
            AND t.parent IS NULL
            AND (:status IS NULL OR t.status = :status)
            AND (:priority IS NULL OR t.priority = :priority)
            AND (:departmentId IS NULL OR t.department.id = :departmentId)
            AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId)
            AND (:searchPattern IS NULL OR LOWER(t.title) LIKE :searchPattern OR LOWER(COALESCE(t.description, '')) LIKE :searchPattern)
            AND t.deadline >= :fromDateTime
            AND t.deadline < :toDateTime
            """)
    Page<Task> findPageByEventIdWithFiltersAndDeadlineRange(
            @Param("eventId") Long eventId,
            @Param("status") TaskStatus status,
            @Param("priority") TaskPriority priority,
            @Param("departmentId") Long departmentId,
            @Param("assigneeId") Long assigneeId,
            @Param("searchPattern") String searchPattern,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toDateTime") LocalDateTime toDateTime,
            Pageable pageable);

    @Query("SELECT t FROM Task t JOIN FETCH t.event LEFT JOIN FETCH t.parent LEFT JOIN FETCH t.department LEFT JOIN FETCH t.assignee WHERE t.id = :taskId")
    Optional<Task> findByIdWithDetails(@Param("taskId") Long taskId);

    @Query("""
            SELECT t FROM Task t
            JOIN FETCH t.event
            LEFT JOIN FETCH t.parent
            LEFT JOIN FETCH t.department
            LEFT JOIN FETCH t.assignee
            WHERE t.parent.id = :parentTaskId
            ORDER BY t.createdAt ASC, t.id ASC
            """)
    List<Task> findAllByParentIdWithDetails(@Param("parentTaskId") Long parentTaskId);

    @Query(value = """
            SELECT t FROM Task t
            JOIN FETCH t.event
            LEFT JOIN FETCH t.parent
            LEFT JOIN FETCH t.department
            LEFT JOIN FETCH t.assignee
            WHERE t.parent.id = :parentTaskId
            """,
            countQuery = """
            SELECT COUNT(t) FROM Task t
            WHERE t.parent.id = :parentTaskId
            """)
    Page<Task> findPageByParentIdWithDetails(
            @Param("parentTaskId") Long parentTaskId,
            Pageable pageable);

    @Query("SELECT COUNT(t) > 0 FROM Task t WHERE t.parent.id = :parentTaskId")
    boolean existsByParentId(@Param("parentTaskId") Long parentTaskId);

    @Query("SELECT t.event.id FROM Task t WHERE t.id = :taskId")
    Optional<Long> findEventIdByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT COUNT(t) > 0 FROM Task t WHERE t.event.id = :eventId AND t.title = :title")
    boolean existsByEventIdAndTitle(@Param("eventId") Long eventId, @Param("title") String title);

    // Efficient check: does this task have the given user as assignee?
    @Query("SELECT COUNT(t) > 0 FROM Task t WHERE t.id = :taskId AND t.assignee.id = :userId")
    boolean existsByIdAndAssigneeId(@Param("taskId") Long taskId, @Param("userId") Long userId);
}
