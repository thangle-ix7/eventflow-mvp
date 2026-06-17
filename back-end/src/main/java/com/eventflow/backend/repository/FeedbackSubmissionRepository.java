package com.eventflow.backend.repository;

import com.eventflow.backend.entity.FeedbackSubmission;
import com.eventflow.backend.entity.FeedbackStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FeedbackSubmissionRepository extends JpaRepository<FeedbackSubmission, Long> {

    @Query(value = """
            SELECT f FROM FeedbackSubmission f
            LEFT JOIN FETCH f.user
            LEFT JOIN FETCH f.event
            LEFT JOIN FETCH f.respondedBy
            WHERE (:status IS NULL OR f.status = :status)
            AND (:eventId IS NULL OR f.event.id = :eventId)
            """,
            countQuery = """
            SELECT COUNT(f) FROM FeedbackSubmission f
            WHERE (:status IS NULL OR f.status = :status)
            AND (:eventId IS NULL OR f.event.id = :eventId)
            """)
    Page<FeedbackSubmission> findForAdmin(
            @Param("status") FeedbackStatus status,
            @Param("eventId") Long eventId,
            Pageable pageable);
}
