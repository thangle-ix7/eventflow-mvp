package com.eventflow.backend.repository;

import com.eventflow.backend.entity.EventInvitation;
import com.eventflow.backend.entity.EventInvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EventInvitationRepository extends JpaRepository<EventInvitation, Long> {

    Optional<EventInvitation> findByEventIdAndInviteeIdAndStatus(
            Long eventId,
            Long inviteeId,
            EventInvitationStatus status);

    @Query("""
            SELECT invitation FROM EventInvitation invitation
            JOIN FETCH invitation.event
            JOIN FETCH invitation.invitee
            WHERE invitation.tokenHash = :tokenHash
            AND invitation.status = :status
            AND invitation.expiresAt > :now
            """)
    Optional<EventInvitation> findActiveByTokenHash(
            @Param("tokenHash") String tokenHash,
            @Param("status") EventInvitationStatus status,
            @Param("now") LocalDateTime now);
}
