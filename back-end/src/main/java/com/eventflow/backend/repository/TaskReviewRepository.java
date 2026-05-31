package com.eventflow.backend.repository;

import com.eventflow.backend.entity.TaskReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskReviewRepository extends JpaRepository<TaskReview, Long> {

    @Query("""
            SELECT tr FROM TaskReview tr
            JOIN FETCH tr.reviewer
            WHERE tr.task.id = :taskId
            ORDER BY tr.reviewedAt DESC
            """)
    List<TaskReview> findAllByTaskIdWithReviewer(@Param("taskId") Long taskId);
}
