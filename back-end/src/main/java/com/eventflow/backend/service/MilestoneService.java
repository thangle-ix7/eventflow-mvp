package com.eventflow.backend.service;

import com.eventflow.backend.dto.MilestoneRequestDTO;
import com.eventflow.backend.dto.MilestoneResponseDTO;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.Milestone;
import com.eventflow.backend.entity.MilestoneStatus;
import com.eventflow.backend.entity.TaskPriority;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.MilestoneRepository;
import com.eventflow.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MilestoneService {

    private final MilestoneRepository milestoneRepository;
    private final EventRepository eventRepository;
    private final TaskRepository taskRepository;

    @Transactional(readOnly = true)
    public List<MilestoneResponseDTO> getMilestones(Long eventId) {
        return milestoneRepository.findAllByEventIdOrderByExpectedDeadlineAscCreatedAtAscIdAsc(eventId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public MilestoneResponseDTO createMilestone(Long eventId, MilestoneRequestDTO request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));

        Milestone milestone = milestoneRepository.save(Milestone.builder()
                .event(event)
                .name(normalizeRequiredText(request.getName(), "Tên milestone không được để trống"))
                .description(normalizeOptionalText(request.getDescription()))
                .expectedDeadline(request.getExpectedDeadline())
                .expectedResult(normalizeOptionalText(request.getExpectedResult()))
                .priority(parsePriorityOrDefault(request.getPriority(), TaskPriority.MEDIUM))
                .status(parseStatusOrDefault(request.getStatus(), MilestoneStatus.TODO))
                .build());

        return mapToResponse(milestone);
    }

    @Transactional
    public MilestoneResponseDTO updateMilestone(Long eventId, Long milestoneId, MilestoneRequestDTO request) {
        Milestone milestone = getMilestoneEntity(eventId, milestoneId);
        milestone.setName(normalizeRequiredText(request.getName(), "Tên milestone không được để trống"));
        milestone.setDescription(normalizeOptionalText(request.getDescription()));
        milestone.setExpectedDeadline(request.getExpectedDeadline());
        milestone.setExpectedResult(normalizeOptionalText(request.getExpectedResult()));
        milestone.setPriority(parsePriorityOrDefault(request.getPriority(), milestone.getPriority()));
        milestone.setStatus(parseStatusOrDefault(request.getStatus(), milestone.getStatus()));
        milestone.setUpdatedAt(LocalDateTime.now());

        return mapToResponse(milestoneRepository.save(milestone));
    }

    private Milestone getMilestoneEntity(Long eventId, Long milestoneId) {
        return milestoneRepository.findByIdAndEventId(milestoneId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy milestone"));
    }

    private MilestoneResponseDTO mapToResponse(Milestone milestone) {
        long totalTasks = taskRepository.countParentTasksByEventAndMilestone(
                milestone.getEvent().getId(),
                milestone.getId());
        long completedTasks = taskRepository.countDoneParentTasksByEventAndMilestone(
                milestone.getEvent().getId(),
                milestone.getId());
        int progress = totalTasks > 0 ? Math.round((completedTasks * 100f) / totalTasks) : 0;

        return MilestoneResponseDTO.builder()
                .id(milestone.getId())
                .eventId(milestone.getEvent().getId())
                .name(milestone.getName())
                .description(milestone.getDescription())
                .expectedDeadline(milestone.getExpectedDeadline())
                .expectedResult(milestone.getExpectedResult())
                .priority(milestone.getPriority())
                .status(milestone.getStatus())
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .progressPercentage(progress)
                .createdAt(milestone.getCreatedAt())
                .updatedAt(milestone.getUpdatedAt())
                .build();
    }

    private TaskPriority parsePriorityOrDefault(String priority, TaskPriority defaultPriority) {
        if (priority == null || priority.isBlank()) {
            return defaultPriority != null ? defaultPriority : TaskPriority.MEDIUM;
        }

        try {
            return TaskPriority.valueOf(priority.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Độ ưu tiên milestone không hợp lệ", e);
        }
    }

    private MilestoneStatus parseStatusOrDefault(String status, MilestoneStatus defaultStatus) {
        if (status == null || status.isBlank()) {
            return defaultStatus != null ? defaultStatus : MilestoneStatus.TODO;
        }

        try {
            return MilestoneStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái milestone không hợp lệ", e);
        }
    }

    private String normalizeRequiredText(String value, String errorMessage) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, errorMessage);
        }
        return value.trim();
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
