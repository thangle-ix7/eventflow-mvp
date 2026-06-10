package com.eventflow.backend.repository;

import com.eventflow.backend.entity.Planning;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlanningRepository extends JpaRepository<Planning, Long> {
    List<Planning> findAllByEventIdOrderByCreatedAtAsc(Long eventId);

    Optional<Planning> findByIdAndEventId(Long planningId, Long eventId);
}
