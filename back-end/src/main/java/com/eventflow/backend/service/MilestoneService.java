package com.eventflow.backend.service;

import com.eventflow.backend.dto.MilestoneRequestDTO;
import com.eventflow.backend.dto.MilestoneResponseDTO;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.Milestone;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.MilestoneRepository;
import com.eventflow.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MilestoneService {
    private static final DateTimeFormatter VIETNAM_DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

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
        validateExpectedDeadlineWithinEvent(request.getExpectedDeadline(), event, null);

        Milestone milestone = milestoneRepository.save(Milestone.builder()
                .event(event)
                .name(normalizeRequiredText(request.getName(), "Tên milestone không được để trống"))
                .description(normalizeOptionalText(request.getDescription()))
                .expectedDeadline(request.getExpectedDeadline())
                .build());

        return mapToResponse(milestone);
    }

    @Transactional
    public MilestoneResponseDTO updateMilestone(Long eventId, Long milestoneId, MilestoneRequestDTO request) {
        Milestone milestone = getMilestoneEntity(eventId, milestoneId);
        validateExpectedDeadlineWithinEvent(request.getExpectedDeadline(), milestone.getEvent(), milestone.getExpectedDeadline());
        milestone.setName(normalizeRequiredText(request.getName(), "Tên milestone không được để trống"));
        milestone.setDescription(normalizeOptionalText(request.getDescription()));
        milestone.setExpectedDeadline(request.getExpectedDeadline());
        milestone.setUpdatedAt(LocalDateTime.now());

        return mapToResponse(milestoneRepository.save(milestone));
    }

    private Milestone getMilestoneEntity(Long eventId, Long milestoneId) {
        return milestoneRepository.findByIdAndEventId(milestoneId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy milestone"));
    }

    private void validateExpectedDeadlineWithinEvent(LocalDateTime expectedDeadline, Event event, LocalDateTime previousDeadline) {
        if (expectedDeadline == null) {
            return;
        }
        boolean unchangedExistingDeadline = previousDeadline != null && previousDeadline.equals(expectedDeadline);
        if (unchangedExistingDeadline) {
            return;
        }

        LocalDateTime eventStartTime = event.getEventDate();
        LocalDateTime eventEndTime = effectiveEventEndTime(event);
        if ((eventStartTime != null && expectedDeadline.isBefore(eventStartTime))
                || (eventEndTime != null && expectedDeadline.isAfter(eventEndTime))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hạn kỳ vọng milestone phải nằm trong khoảng hợp lệ: "
                    + formatDateTime(eventStartTime)
                    + " - "
                    + formatDateTime(eventEndTime));
        }
    }

    private LocalDateTime effectiveEventEndTime(Event event) {
        LocalDateTime startTime = event.getEventDate();
        if (startTime == null) {
            return null;
        }
        LocalDateTime endTime = event.getEndTime() != null ? event.getEndTime() : startTime.toLocalDate().atTime(LocalTime.MAX);
        return endTime.isBefore(startTime) ? startTime : endTime;
    }

    private String formatDateTime(LocalDateTime value) {
        return value != null ? value.format(VIETNAM_DATE_TIME_FORMATTER) : "chưa xác định";
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
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .progressPercentage(progress)
                .createdAt(milestone.getCreatedAt())
                .updatedAt(milestone.getUpdatedAt())
                .build();
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
