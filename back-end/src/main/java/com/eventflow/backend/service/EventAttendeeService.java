package com.eventflow.backend.service;

import com.eventflow.backend.dto.CheckInRequest;
import com.eventflow.backend.dto.CheckInResponse;
import com.eventflow.backend.dto.EventAttendeeRequest;
import com.eventflow.backend.dto.EventAttendeeResponse;
import com.eventflow.backend.entity.AttendeeStatus;
import com.eventflow.backend.entity.AttendeeType;
import com.eventflow.backend.entity.CheckInMethod;
import com.eventflow.backend.entity.CheckInRecord;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.EventAttendee;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.CheckInRecordRepository;
import com.eventflow.backend.repository.EventAttendeeRepository;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventAttendeeService {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final EventAttendeeRepository attendeeRepository;
    private final CheckInRecordRepository checkInRecordRepository;

    @Transactional(readOnly = true)
    public List<EventAttendeeResponse> getAttendees(Long eventId, String status) {
        ensureEvent(eventId);
        Sort sort = Sort.by(Sort.Direction.ASC, "fullName").and(Sort.by(Sort.Direction.ASC, "id"));

        if (status == null || status.isBlank()) {
            return attendeeRepository.findAllByEventId(eventId, sort).stream()
                    .map(this::mapAttendee)
                    .toList();
        }

        return attendeeRepository.findAllByEventIdAndStatus(eventId, parseStatus(status, AttendeeStatus.INVITED), sort).stream()
                .map(this::mapAttendee)
                .toList();
    }

    @Transactional
    public EventAttendeeResponse createAttendee(Long eventId, EventAttendeeRequest request) {
        Event event = ensureEvent(eventId);
        EventAttendee attendee = attendeeRepository.save(EventAttendee.builder()
                .event(event)
                .fullName(requiredText(request.getFullName(), "Ten khach moi khong duoc de trong"))
                .email(optionalText(request.getEmail()))
                .phone(optionalText(request.getPhone()))
                .attendeeType(parseType(request.getAttendeeType(), AttendeeType.GUEST))
                .status(parseStatus(request.getStatus(), AttendeeStatus.INVITED))
                .qrToken(generateQrToken())
                .note(optionalText(request.getNote()))
                .build());

        return mapAttendee(attendee);
    }

    @Transactional
    public EventAttendeeResponse updateAttendee(Long eventId, Long attendeeId, EventAttendeeRequest request) {
        EventAttendee attendee = attendeeRepository.findByIdAndEventId(attendeeId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay khach moi"));

        attendee.setFullName(requiredText(request.getFullName(), "Ten khach moi khong duoc de trong"));
        attendee.setEmail(optionalText(request.getEmail()));
        attendee.setPhone(optionalText(request.getPhone()));
        attendee.setAttendeeType(parseType(request.getAttendeeType(), attendee.getAttendeeType()));
        attendee.setStatus(parseStatus(request.getStatus(), attendee.getStatus()));
        attendee.setNote(optionalText(request.getNote()));
        attendee.setUpdatedAt(LocalDateTime.now());

        return mapAttendee(attendeeRepository.save(attendee));
    }

    @Transactional
    public void deleteAttendee(Long eventId, Long attendeeId) {
        EventAttendee attendee = attendeeRepository.findByIdAndEventId(attendeeId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay khach moi"));

        attendeeRepository.delete(attendee);
    }

    @Transactional
    public EventAttendeeResponse confirmAttendee(Long eventId, Long attendeeId) {
        EventAttendee attendee = attendeeRepository.findByIdAndEventId(attendeeId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay khach moi"));

        if (attendee.getStatus() == AttendeeStatus.INVITED) {
            attendee.setStatus(AttendeeStatus.CONFIRMED);
            attendee.setUpdatedAt(LocalDateTime.now());
        }

        return mapAttendee(attendeeRepository.save(attendee));
    }

    @Transactional
    public CheckInResponse checkIn(Long eventId, Long userId, CheckInRequest request) {
        EventAttendee attendee = resolveCheckInAttendee(eventId, request);

        if (attendee.getStatus() == AttendeeStatus.CHECKED_IN) {
            return CheckInResponse.builder()
                    .attendee(mapAttendee(attendee))
                    .checkedInAt(attendee.getCheckedInAt())
                    .message("Khach moi da check-in truoc do")
                    .build();
        }

        Event event = attendee.getEvent();
        User checker = userId != null ? userRepository.findById(userId).orElse(null) : null;
        LocalDateTime checkedInAt = LocalDateTime.now();

        attendee.setStatus(AttendeeStatus.CHECKED_IN);
        attendee.setCheckedInAt(checkedInAt);
        attendee.setUpdatedAt(checkedInAt);
        attendeeRepository.save(attendee);

        CheckInRecord record = checkInRecordRepository.save(CheckInRecord.builder()
                .event(event)
                .attendee(attendee)
                .checkedInBy(checker)
                .checkedInAt(checkedInAt)
                .method(request.getQrToken() != null && !request.getQrToken().isBlank() ? CheckInMethod.QR : CheckInMethod.MANUAL)
                .note(optionalText(request.getNote()))
                .build());

        return CheckInResponse.builder()
                .recordId(record.getId())
                .attendee(mapAttendee(attendee))
                .checkedInAt(record.getCheckedInAt())
                .message("Check-in thanh cong")
                .build();
    }

    private EventAttendee resolveCheckInAttendee(Long eventId, CheckInRequest request) {
        if (request.getQrToken() != null && !request.getQrToken().isBlank()) {
            EventAttendee attendee = attendeeRepository.findByQrToken(request.getQrToken().trim())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ma QR khong hop le"));

            if (!attendee.getEvent().getId().equals(eventId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ma QR khong thuoc su kien nay");
            }

            return attendee;
        }

        if (request.getAttendeeId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Can qrToken hoac attendeeId de check-in");
        }

        return attendeeRepository.findByIdAndEventId(request.getAttendeeId(), eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay khach moi"));
    }

    private Event ensureEvent(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay su kien"));
    }

    private EventAttendeeResponse mapAttendee(EventAttendee attendee) {
        return EventAttendeeResponse.builder()
                .id(attendee.getId())
                .eventId(attendee.getEvent().getId())
                .fullName(attendee.getFullName())
                .email(attendee.getEmail())
                .phone(attendee.getPhone())
                .attendeeType(attendee.getAttendeeType())
                .status(attendee.getStatus())
                .qrToken(attendee.getQrToken())
                .checkInUrl("/events/" + attendee.getEvent().getId() + "/check-in?token=" + attendee.getQrToken())
                .note(attendee.getNote())
                .checkedInAt(attendee.getCheckedInAt())
                .createdAt(attendee.getCreatedAt())
                .build();
    }

    private String generateQrToken() {
        byte[] bytes = new byte[16];
        SECURE_RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private AttendeeType parseType(String value, AttendeeType defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }

        try {
            return AttendeeType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loai khach moi khong hop le", e);
        }
    }

    private AttendeeStatus parseStatus(String value, AttendeeStatus defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }

        try {
            return AttendeeStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trang thai khach moi khong hop le", e);
        }
    }

    private String requiredText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }

        return value.trim();
    }

    private String optionalText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
