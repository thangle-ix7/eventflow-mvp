package com.eventflow.backend.repository;

import com.eventflow.backend.entity.PlanningPhase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlanningPhaseRepository extends JpaRepository<PlanningPhase, Long> {
    List<PlanningPhase> findAllByPlanningIdOrderByOrderIndexAscIdAsc(Long planningId);

    Optional<PlanningPhase> findByIdAndPlanningIdAndPlanningEventId(Long phaseId, Long planningId, Long eventId);
}
