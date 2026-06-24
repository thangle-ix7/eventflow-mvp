package com.eventflow.backend.repository;

import com.eventflow.backend.entity.AttendeeStatus;
import com.eventflow.backend.entity.EventAttendee;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventAttendeeRepository extends JpaRepository<EventAttendee, Long> {
    List<EventAttendee> findAllByEventId(Long eventId, Sort sort);

    List<EventAttendee> findAllByEventIdAndStatus(Long eventId, AttendeeStatus status, Sort sort);

    List<EventAttendee> findAllByEventIdAndSession_Id(Long eventId, Long sessionId, Sort sort);

    List<EventAttendee> findAllByEventIdAndSession_IdAndStatus(Long eventId, Long sessionId, AttendeeStatus status, Sort sort);

    Optional<EventAttendee> findByIdAndEventId(Long id, Long eventId);

    Optional<EventAttendee> findByQrToken(String qrToken);

    Optional<EventAttendee> findByInviteCode(String inviteCode);

    boolean existsByInviteCode(String inviteCode);

    List<EventAttendee> findAllByEventIdAndSession_IdAndEmailIsNotNull(Long eventId, Long sessionId, Sort sort);

    long countBySession_Id(Long sessionId);

    long countBySession_IdAndStatus(Long sessionId, AttendeeStatus status);
}

