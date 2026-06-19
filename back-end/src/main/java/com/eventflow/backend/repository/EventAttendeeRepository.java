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

    Optional<EventAttendee> findByIdAndEventId(Long id, Long eventId);

    Optional<EventAttendee> findByQrToken(String qrToken);
}
