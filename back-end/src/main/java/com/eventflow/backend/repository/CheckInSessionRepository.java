package com.eventflow.backend.repository;

import com.eventflow.backend.entity.CheckInSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CheckInSessionRepository extends JpaRepository<CheckInSession, Long> {
    List<CheckInSession> findAllByEventIdOrderByCreatedAtDesc(Long eventId);

    Optional<CheckInSession> findByIdAndEventId(Long id, Long eventId);
}