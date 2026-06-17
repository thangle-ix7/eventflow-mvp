package com.eventflow.backend.repository;

import com.eventflow.backend.entity.CommercialStatus;
import com.eventflow.backend.entity.EventPass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventPassRepository extends JpaRepository<EventPass, Long> {

    @Query("""
            SELECT ep FROM EventPass ep
            JOIN FETCH ep.plan p
            JOIN FETCH ep.purchaser
            WHERE ep.event.id = :eventId
              AND ep.status = :status
              AND ep.startsAt <= :now
              AND (ep.expiresAt IS NULL OR ep.expiresAt > :now)
            ORDER BY p.priorityRank DESC, ep.createdAt DESC
            """)
    List<EventPass> findActiveForEvent(
            @Param("eventId") Long eventId,
            @Param("status") CommercialStatus status,
            @Param("now") LocalDateTime now);
}
