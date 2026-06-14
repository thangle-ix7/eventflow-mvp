package com.eventflow.backend.service;

import com.eventflow.backend.dto.EventRequestDTO;
import com.eventflow.backend.dto.EventResponseDTO;
import com.eventflow.backend.dto.PageResponse;
import com.eventflow.backend.entity.Department;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.EventMember;
import com.eventflow.backend.entity.EventNature;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.entity.UserRole;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final EventMemberRepository eventMemberRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<EventResponseDTO> getEventsForUser(
            Long userId,
            int page,
            int size,
            String sort,
            String direction,
            String status,
            String search) {

        var pageable = PageRequest.of(
                normalizePage(page),
                normalizeSize(size),
                Sort.by(resolveDirection(direction), resolveSort(sort)));

        return PageResponse.from(eventMemberRepository.findAllByUserIdWithEvent(
                        userId,
                        normalizeStatusFilter(status),
                        normalizeSearch(search),
                        pageable)
                .map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public EventResponseDTO getEventForUser(Long eventId, Long userId) {
        EventMember member = eventMemberRepository.findByEventIdAndUserIdWithEvent(eventId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));

        return mapToResponse(member);
    }

    @Transactional
    public EventResponseDTO createEvent(EventRequestDTO request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng không hợp lệ"));

        EventNature nature = request.getNature() != null ? request.getNature() : EventNature.NORMAL;

        Event event = eventRepository.save(Event.builder()
                .name(request.getName().trim())
                .description(normalizeOptionalText(request.getDescription()))
                .location(normalizeOptionalText(request.getLocation()))
                .eventDate(resolveStartTime(request))
                .endTime(resolveEndTime(request))
                .status(normalizeStatus(request.getStatus()))
                .nature(nature)
                .build());

        EventMember leader = eventMemberRepository.save(EventMember.builder()
                .event(event)
                .user(user)
                .role(UserRole.LEADER)
                .build());

        return mapToResponse(leader);
    }

    @Transactional
    public EventResponseDTO updateEvent(Long eventId, EventRequestDTO request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));

        event.setName(request.getName().trim());
        event.setDescription(normalizeOptionalText(request.getDescription()));
        event.setLocation(normalizeOptionalText(request.getLocation()));
        event.setEventDate(resolveStartTime(request));
        event.setEndTime(resolveEndTime(request));
        event.setStatus(normalizeStatus(request.getStatus()));

        return mapToResponse(eventRepository.save(event), UserRole.LEADER);
    }

    @Transactional
    public void deleteEvent(Long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện");
        }

        eventRepository.deleteById(eventId);
    }

    @Transactional(readOnly = true)
    public PageResponse<EventResponseDTO> getTemplates(
            int page,
            int size,
            String sort,
            String direction,
            String search) {

        var pageable = PageRequest.of(
                normalizePage(page),
                normalizeSize(size),
                Sort.by(resolveDirection(direction), resolveTemplateSort(sort)));

        return PageResponse.from(eventRepository.findAllByNature(
                        EventNature.TEMPLATE,
                        normalizeSearch(search),
                        pageable)
                .map(event -> mapToResponse(event, null)));
    }

    @Transactional(readOnly = true)
    public EventResponseDTO getTemplate(Long templateId) {
        Event template = eventRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy template"));

        if (template.getNature() != EventNature.TEMPLATE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event này không phải là template");
        }

        return mapToResponse(template, null);
    }

    @Transactional
    public EventResponseDTO createTemplate(EventRequestDTO request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng không hợp lệ"));

        Event template = eventRepository.save(Event.builder()
                .name(request.getName().trim())
                .description(normalizeOptionalText(request.getDescription()))
                .location(normalizeOptionalText(request.getLocation()))
                .eventDate(request.getEventDate() != null ? request.getEventDate() : LocalDateTime.now())
                .endTime(request.getEndTime())
                .status(normalizeStatus(request.getStatus()))
                .nature(EventNature.TEMPLATE)
                .contextDescription(normalizeOptionalText(request.getDescription()))
                .build());

        // Template không cần EventMember (public cho tất cả)
        return mapToResponse(template, null);
    }

    @Transactional
    public EventResponseDTO updateTemplate(Long templateId, EventRequestDTO request) {
        Event template = eventRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy template"));

        if (template.getNature() != EventNature.TEMPLATE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event này không phải là template");
        }

        template.setName(request.getName().trim());
        template.setDescription(normalizeOptionalText(request.getDescription()));
        template.setLocation(normalizeOptionalText(request.getLocation()));
        template.setEventDate(request.getEventDate() != null ? request.getEventDate() : template.getEventDate());
        template.setEndTime(request.getEndTime());
        template.setStatus(normalizeStatus(request.getStatus()));

        return mapToResponse(eventRepository.save(template), null);
    }

    @Transactional
    public void deleteTemplate(Long templateId) {
        Event template = eventRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy template"));

        if (template.getNature() != EventNature.TEMPLATE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event này không phải là template");
        }

        eventRepository.deleteById(templateId);
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "ACTIVE";
        }

        return status.trim().toUpperCase();
    }

    private String normalizeStatusFilter(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return status.trim().toUpperCase();
    }

    private String normalizeSearch(String search) {
        if (search == null || search.isBlank()) {
            return "";
        }
        return search.trim();
    }

    private LocalDateTime resolveStartTime(EventRequestDTO request) {
        LocalDateTime startTime = request.getStartTime() != null ? request.getStartTime() : request.getEventDate();
        if (startTime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thời gian bắt đầu sự kiện không được để trống");
        }
        return startTime;
    }

    private LocalDateTime resolveEndTime(EventRequestDTO request) {
        LocalDateTime startTime = resolveStartTime(request);
        LocalDateTime endTime = request.getEndTime();
        if (endTime == null) {
            return startTime;
        }
        if (endTime.isBefore(startTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thời gian kết thúc sự kiện phải sau thời gian bắt đầu");
        }
        return endTime;
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private int normalizePage(int page) {
        return Math.max(page, 0);
    }

    private int normalizeSize(int size) {
        return Math.min(Math.max(size, 1), 100);
    }

    private Sort.Direction resolveDirection(String direction) {
        return "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
    }

    private String resolveSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return "event.eventDate";
        }

        return switch (sort) {
            case "name" -> "event.name";
            case "status" -> "event.status";
            case "createdAt" -> "event.createdAt";
            case "eventDate" -> "event.eventDate";
            default -> "event.eventDate";
        };
    }

    private String resolveTemplateSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return "name";
        }

        return switch (sort) {
            case "name" -> "name";
            case "createdAt" -> "createdAt";
            default -> "name";
        };
    }

    private EventResponseDTO mapToResponse(EventMember member) {
        Department department = member.getDepartment();
        return mapToResponse(
                member.getEvent(),
                member.getRole(),
                department != null ? department.getId() : null,
                department != null ? department.getName() : null);
    }

    private EventResponseDTO mapToResponse(Event event, UserRole role) {
        return mapToResponse(event, role, null, null);
    }

    private EventResponseDTO mapToResponse(Event event, UserRole role, Long departmentId, String departmentName) {
        return EventResponseDTO.builder()
                .id(event.getId())
                .name(event.getName())
                .description(event.getDescription())
                .location(event.getLocation())
                .startTime(event.getEventDate())
                .endTime(event.getEndTime())
                .eventDate(event.getEventDate())
                .status(event.getStatus())
                .nature(event.getNature())
                .role(role != null ? role.name() : null)
                .departmentId(departmentId)
                .departmentName(departmentName)
                .createdAt(event.getCreatedAt())
                .build();
    }
}
