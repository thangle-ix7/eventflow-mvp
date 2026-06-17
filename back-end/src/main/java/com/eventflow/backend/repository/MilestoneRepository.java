package com.eventflow.backend.repository;

import com.eventflow.backend.entity.Milestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MilestoneRepository extends JpaRepository<Milestone, Long> {
    List<Milestone> findAllByEventIdOrderByExpectedDeadlineAscCreatedAtAscIdAsc(Long eventId);

    Optional<Milestone> findByIdAndEventId(Long milestoneId, Long eventId);
}
