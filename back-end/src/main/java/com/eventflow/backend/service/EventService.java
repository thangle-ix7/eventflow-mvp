package com.eventflow.backend.service;

import com.eventflow.backend.dto.EventRequestDTO;
import com.eventflow.backend.dto.EventResponseDTO;
import com.eventflow.backend.dto.PageResponse;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.EventMember;
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

        Event event = eventRepository.save(Event.builder()
                .name(request.getName().trim())
                .eventDate(request.getEventDate())
                .status(normalizeStatus(request.getStatus()))
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
        event.setEventDate(request.getEventDate());
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
            return null;
        }
        return search.trim();
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

    private EventResponseDTO mapToResponse(EventMember member) {
        return mapToResponse(member.getEvent(), member.getRole());
    }

    private EventResponseDTO mapToResponse(Event event, UserRole role) {
        return EventResponseDTO.builder()
                .id(event.getId())
                .name(event.getName())
                .eventDate(event.getEventDate())
                .status(event.getStatus())
                .role(role.name())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
