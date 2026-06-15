package com.eventflow.backend.service;

import com.eventflow.backend.dto.PlanningPhaseRequestDTO;
import com.eventflow.backend.dto.PlanningPhaseResponseDTO;
import com.eventflow.backend.dto.PlanningRequestDTO;
import com.eventflow.backend.dto.PlanningResponseDTO;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.Planning;
import com.eventflow.backend.entity.PlanningPhase;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.PlanningPhaseRepository;
import com.eventflow.backend.repository.PlanningRepository;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PlanningService {

    private final PlanningRepository planningRepository;
    private final PlanningPhaseRepository planningPhaseRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<PlanningResponseDTO> getPlannings(Long eventId) {
        return planningRepository.findAllByEventIdOrderByCreatedAtAsc(eventId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PlanningResponseDTO getPlanning(Long eventId, Long planningId) {
        Planning planning = getPlanningEntity(eventId, planningId);
        return mapToResponse(planning);
    }

    @Transactional
    public PlanningResponseDTO createPlanning(Long eventId, Long userId, PlanningRequestDTO request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));
        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng không hợp lệ"));

        Planning planning = planningRepository.save(Planning.builder()
                .event(event)
                .title(normalizeRequiredText(request.getTitle()))
                .description(normalizeOptionalText(request.getDescription()))
                .createdBy(creator)
                .build());

        if (request.getPhases() != null) {
            int index = 0;
            for (PlanningPhaseRequestDTO phaseRequest : request.getPhases()) {
                createPhaseEntity(planning, phaseRequest, index++);
            }
        }

        return mapToResponse(planning);
    }

    @Transactional
    public PlanningResponseDTO updatePlanning(Long eventId, Long planningId, PlanningRequestDTO request) {
        Planning planning = getPlanningEntity(eventId, planningId);
        planning.setTitle(normalizeRequiredText(request.getTitle()));
        planning.setDescription(normalizeOptionalText(request.getDescription()));
        planning.setUpdatedAt(LocalDateTime.now());

        return mapToResponse(planningRepository.save(planning));
    }

    @Transactional
    public void deletePlanning(Long eventId, Long planningId) {
        Planning planning = getPlanningEntity(eventId, planningId);
        planningRepository.delete(planning);
    }

    @Transactional
    public PlanningPhaseResponseDTO createPhase(Long eventId, Long planningId, PlanningPhaseRequestDTO request) {
        Planning planning = getPlanningEntity(eventId, planningId);
        PlanningPhase phase = createPhaseEntity(planning, request, nextPhaseOrderIndex(planningId));
        return mapPhaseToResponse(phase);
    }

    @Transactional
    public PlanningPhaseResponseDTO updatePhase(Long eventId, Long planningId, Long phaseId, PlanningPhaseRequestDTO request) {
        PlanningPhase phase = getPhaseEntity(eventId, planningId, phaseId);
        phase.setPhaseName(normalizeRequiredText(request.getPhaseName()));
        phase.setDescription(normalizeOptionalText(request.getDescription()));
        phase.setObjective(normalizeOptionalText(request.getObjective()));
        phase.setOrderIndex(resolveOrderIndex(request.getOrderIndex(), phase.getOrderIndex()));
        phase.setUpdatedAt(LocalDateTime.now());

        return mapPhaseToResponse(planningPhaseRepository.save(phase));
    }

    @Transactional
    public void deletePhase(Long eventId, Long planningId, Long phaseId) {
        PlanningPhase phase = getPhaseEntity(eventId, planningId, phaseId);
        planningPhaseRepository.delete(phase);
    }

    private Planning getPlanningEntity(Long eventId, Long planningId) {
        return planningRepository.findByIdAndEventId(planningId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy kế hoạch"));
    }

    private PlanningPhase getPhaseEntity(Long eventId, Long planningId, Long phaseId) {
        return planningPhaseRepository.findByIdAndPlanningIdAndPlanningEventId(phaseId, planningId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy giai đoạn kế hoạch"));
    }

    private PlanningPhase createPhaseEntity(Planning planning, PlanningPhaseRequestDTO request, int fallbackOrderIndex) {
        return planningPhaseRepository.save(PlanningPhase.builder()
                .planning(planning)
                .phaseName(normalizeRequiredText(request.getPhaseName()))
                .description(normalizeOptionalText(request.getDescription()))
                .objective(normalizeOptionalText(request.getObjective()))
                .orderIndex(resolveOrderIndex(request.getOrderIndex(), fallbackOrderIndex))
                .build());
    }

    private int nextPhaseOrderIndex(Long planningId) {
        return planningPhaseRepository.findAllByPlanningIdOrderByOrderIndexAscIdAsc(planningId).stream()
                .map(PlanningPhase::getOrderIndex)
                .filter(orderIndex -> orderIndex != null)
                .max(Integer::compareTo)
                .map(max -> max + 1)
                .orElse(0);
    }

    private PlanningResponseDTO mapToResponse(Planning planning) {
        User creator = planning.getCreatedBy();
        return PlanningResponseDTO.builder()
                .id(planning.getId())
                .eventId(planning.getEvent().getId())
                .title(planning.getTitle())
                .description(planning.getDescription())
                .createdByUserId(creator != null ? creator.getId() : null)
                .createdByName(creator != null ? creator.getName() : null)
                .phases(planningPhaseRepository.findAllByPlanningIdOrderByOrderIndexAscIdAsc(planning.getId()).stream()
                        .map(this::mapPhaseToResponse)
                        .toList())
                .createdAt(planning.getCreatedAt())
                .updatedAt(planning.getUpdatedAt())
                .build();
    }

    private PlanningPhaseResponseDTO mapPhaseToResponse(PlanningPhase phase) {
        return PlanningPhaseResponseDTO.builder()
                .id(phase.getId())
                .planningId(phase.getPlanning().getId())
                .phaseName(phase.getPhaseName())
                .description(phase.getDescription())
                .objective(phase.getObjective())
                .orderIndex(phase.getOrderIndex())
                .createdAt(phase.getCreatedAt())
                .updatedAt(phase.getUpdatedAt())
                .build();
    }

    private String normalizeRequiredText(String value) {
        return value.trim();
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private int resolveOrderIndex(Integer value, Integer fallback) {
        return value != null ? Math.max(value, 0) : Math.max(fallback != null ? fallback : 0, 0);
    }
}
