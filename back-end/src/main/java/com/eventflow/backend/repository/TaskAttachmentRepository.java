package com.eventflow.backend.repository;

import com.eventflow.backend.entity.TaskAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskAttachmentRepository extends JpaRepository<TaskAttachment, Long> {

    @Query("""
            SELECT ta FROM TaskAttachment ta
            JOIN FETCH ta.task t
            JOIN FETCH ta.uploader u
            WHERE t.id = :taskId
            ORDER BY ta.createdAt DESC
            """)
    List<TaskAttachment> findAllByTaskIdWithUploader(@Param("taskId") Long taskId);

    @Query("""
            SELECT COALESCE(SUM(ta.sizeBytes), 0)
            FROM TaskAttachment ta
            WHERE ta.task.id = :taskId
              AND UPPER(ta.storageProvider) <> 'LINK'
            """)
    long sumStoredFileSizeByTaskId(@Param("taskId") Long taskId);

    @Query("""
            SELECT ta FROM TaskAttachment ta
            JOIN FETCH ta.task t
            JOIN FETCH t.event
            LEFT JOIN FETCH t.department
            LEFT JOIN FETCH t.assignee
            JOIN FETCH ta.uploader
            WHERE ta.id = :attachmentId
            """)
    Optional<TaskAttachment> findByIdWithDetails(@Param("attachmentId") Long attachmentId);
}
