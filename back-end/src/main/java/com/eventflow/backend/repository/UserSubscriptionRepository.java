package com.eventflow.backend.repository;

import com.eventflow.backend.entity.CommercialStatus;
import com.eventflow.backend.entity.UserSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, Long> {

    @Query("""
            SELECT us FROM UserSubscription us
            JOIN FETCH us.plan p
            WHERE us.user.id = :userId
              AND us.status = :status
              AND (us.currentPeriodEnd IS NULL OR us.currentPeriodEnd > :now)
            ORDER BY p.priorityRank DESC, us.createdAt DESC
            """)
    List<UserSubscription> findActiveForUser(
            @Param("userId") Long userId,
            @Param("status") CommercialStatus status,
            @Param("now") LocalDateTime now);

    @Query("""
            SELECT us FROM UserSubscription us
            JOIN FETCH us.plan p
            JOIN FETCH us.user u
            WHERE us.user.id IN :userIds
              AND us.status = :status
              AND (us.currentPeriodEnd IS NULL OR us.currentPeriodEnd > :now)
            ORDER BY p.priorityRank DESC, us.createdAt DESC
            """)
    List<UserSubscription> findActiveForUsers(
            @Param("userIds") List<Long> userIds,
            @Param("status") CommercialStatus status,
            @Param("now") LocalDateTime now);
}
