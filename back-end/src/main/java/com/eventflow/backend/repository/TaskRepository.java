package com.eventflow.backend.repository;

import com.eventflow.backend.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query("SELECT t FROM Task t JOIN FETCH t.assignee JOIN FETCH t.event WHERE t.status != com.eventflow.backend.entity.TaskStatus.DONE AND t.assignee IS NOT NULL")
    List<Task> findAllPendingTasksWithAssignees();

    @Query("SELECT t FROM Task t JOIN FETCH t.department LEFT JOIN FETCH t.assignee WHERE t.event.id = :eventId")
    List<Task> findAllByEventIdWithDetails(Long eventId);

    // Efficient check: does this task have the given user as assignee?
    @Query("SELECT COUNT(t) > 0 FROM Task t WHERE t.id = :taskId AND t.assignee.id = :userId")
    boolean existsByIdAndAssigneeId(@Param("taskId") Long taskId, @Param("userId") Long userId);
}
