package com.eventflow.backend.repository;

import com.eventflow.backend.entity.Notification;
import com.eventflow.backend.entity.NotiStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Idempotent insert - prevents duplicate notifications
    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO notifications 
            (user_id, task_id, channel, type, status, created_at)
            VALUES 
            (:userId, :taskId, :channel, :type, :status, CURRENT_TIMESTAMP)
            ON CONFLICT ON CONSTRAINT uq_notif_user_task_type DO NOTHING
            """,
            nativeQuery = true)
    void insertIdempotentNotification(@Param("userId") Long userId,
                                      @Param("taskId") Long taskId,
                                      @Param("channel") String channel,
                                      @Param("type") String type,
                                      @Param("status") String status);

    // Find all PENDING notifications with retry count < 3, eagerly fetch user and task
    @Query("SELECT n FROM Notification n " +
           "JOIN FETCH n.user " +
           "JOIN FETCH n.task " +
           "JOIN FETCH n.task.event " +
           "WHERE n.status = :status AND n.retryCount < 3")
    List<Notification> findPendingWithDetails(@Param("status") NotiStatus status);

    long countByUserIdAndStatus(Long userId, NotiStatus status);

    // Mark notification as SENT
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.status = com.eventflow.backend.entity.NotiStatus.SENT, n.sentAt = CURRENT_TIMESTAMP WHERE n.id = :id")
    int markAsSent(@Param("id") Long id);

    // Increment retry count and optionally switch channel to EMAIL
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET " +
           "n.retryCount = CASE WHEN n.channel = com.eventflow.backend.entity.NotiChannel.TELEGRAM " +
           "AND n.retryCount + 1 >= 3 THEN 0 ELSE n.retryCount + 1 END, " +
           "n.errorLog = :errorLog, " +
           "n.channel = CASE WHEN n.channel = com.eventflow.backend.entity.NotiChannel.TELEGRAM " +
           "AND n.retryCount + 1 >= 3 THEN com.eventflow.backend.entity.NotiChannel.EMAIL ELSE n.channel END " +
           "WHERE n.id = :id")
    int incrementRetryAndFallback(@Param("id") Long id, @Param("errorLog") String errorLog);

    // Hard mark as FAILED when retry count reaches max
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.status = com.eventflow.backend.entity.NotiStatus.FAILED WHERE n.id = :id")
    int markAsFailed(@Param("id") Long id);
}
