package com.eventflow.backend.service;

import com.eventflow.backend.dto.AttendeeImportResponse;
import com.eventflow.backend.dto.AttendeeInviteEmailResponse;
import com.eventflow.backend.dto.CheckInRequest;
import com.eventflow.backend.dto.CheckInResponse;
import com.eventflow.backend.dto.CheckInSessionRequest;
import com.eventflow.backend.dto.CheckInSessionResponse;
import com.eventflow.backend.dto.EventAttendeeRequest;
import com.eventflow.backend.dto.EventAttendeeResponse;
import com.eventflow.backend.entity.AttendeeStatus;
import com.eventflow.backend.entity.AttendeeType;
import com.eventflow.backend.entity.CheckInMethod;
import com.eventflow.backend.entity.CheckInRecord;
import com.eventflow.backend.entity.CheckInSession;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.EventAttendee;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.CheckInRecordRepository;
import com.eventflow.backend.repository.CheckInSessionRepository;
import com.eventflow.backend.repository.EventAttendeeRepository;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventAttendeeService {
    private static final DateTimeFormatter VIETNAM_DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final String[] IMPORT_HEADERS = {
            "Ho ten", "Email", "So dien thoai", "Loai khach", "Trang thai", "Ghi chu"
    };

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final EventAttendeeRepository attendeeRepository;
    private final CheckInRecordRepository checkInRecordRepository;
    private final CheckInSessionRepository sessionRepository;
    private final EventAttendeeInvitationEmailService invitationEmailService;

    @Transactional(readOnly = true)
    public List<CheckInSessionResponse> getSessions(Long eventId) {
        ensureEvent(eventId);
        return sessionRepository.findAllByEventIdOrderByCreatedAtDesc(eventId).stream()
                .map(this::mapSession)
                .toList();
    }

    @Transactional
    public CheckInSessionResponse createSession(Long eventId, CheckInSessionRequest request) {
        Event event = ensureEvent(eventId);
        validateSessionTimeWithinEvent(request.getStartsAt(), request.getEndsAt(), event);
        CheckInSession session = sessionRepository.save(CheckInSession.builder()
                .event(event)
                .name(requiredText(request.getName(), "Ten session check-in khong duoc de trong"))
                .location(optionalText(request.getLocation()))
                .startsAt(request.getStartsAt())
                .endsAt(request.getEndsAt())
                .active(request.getActive() == null || request.getActive())
                .build());
        return mapSession(session);
    }

    private void validateSessionTimeWithinEvent(LocalDateTime startsAt, LocalDateTime endsAt, Event event) {
        if (startsAt == null || endsAt == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thời gian bắt đầu và kết thúc session không được để trống");
        }
        if (!endsAt.isAfter(startsAt)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thời gian kết thúc session phải sau thời gian bắt đầu");
        }

        LocalDateTime eventStartTime = event.getEventDate();
        LocalDateTime eventEndTime = effectiveEventEndTime(event);
        if (startsAt.isBefore(eventStartTime) || endsAt.isAfter(eventEndTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thời gian session phải nằm trong khoảng hợp lệ: "
                    + formatDateTime(eventStartTime)
                    + " - "
                    + formatDateTime(eventEndTime));
        }
    }

    private LocalDateTime effectiveEventEndTime(Event event) {
        LocalDateTime startTime = event.getEventDate();
        LocalDateTime endTime = event.getEndTime() != null ? event.getEndTime() : startTime.toLocalDate().atTime(LocalTime.MAX);
        return endTime.isBefore(startTime) ? startTime : endTime;
    }

    private String formatDateTime(LocalDateTime value) {
        return value != null ? value.format(VIETNAM_DATE_TIME_FORMATTER) : "chưa xác định";
    }

    @Transactional(readOnly = true)
    public List<EventAttendeeResponse> getAttendees(Long eventId, String status, Long sessionId) {
        ensureEvent(eventId);
        CheckInSession session = sessionId != null ? ensureSession(eventId, sessionId) : null;
        AttendeeStatus parsedStatus = status == null || status.isBlank() ? null : parseStatus(status, AttendeeStatus.INVITED);
        Sort sort = Sort.by(Sort.Direction.ASC, "fullName").and(Sort.by(Sort.Direction.ASC, "id"));

        if (session != null && parsedStatus != null) {
            return attendeeRepository.findAllByEventIdAndSession_IdAndStatus(eventId, session.getId(), parsedStatus, sort).stream()
                    .map(this::mapAttendee)
                    .toList();
        }

        if (session != null) {
            return attendeeRepository.findAllByEventIdAndSession_Id(eventId, session.getId(), sort).stream()
                    .map(this::mapAttendee)
                    .toList();
        }

        if (parsedStatus != null) {
            return attendeeRepository.findAllByEventIdAndStatus(eventId, parsedStatus, sort).stream()
                    .map(this::mapAttendee)
                    .toList();
        }

        return attendeeRepository.findAllByEventId(eventId, sort).stream()
                .map(this::mapAttendee)
                .toList();
    }

    @Transactional
    public EventAttendeeResponse createAttendee(Long eventId, EventAttendeeRequest request) {
        Event event = ensureEvent(eventId);
        CheckInSession session = request.getSessionId() != null ? ensureSession(eventId, request.getSessionId()) : null;
        EventAttendee attendee = attendeeRepository.save(EventAttendee.builder()
                .event(event)
                .session(session)
                .fullName(requiredText(request.getFullName(), "Ten khach moi khong duoc de trong"))
                .email(optionalText(request.getEmail()))
                .phone(optionalText(request.getPhone()))
                .attendeeType(parseType(request.getAttendeeType(), AttendeeType.GUEST))
                .status(parseStatus(request.getStatus(), AttendeeStatus.INVITED))
                .qrToken(generateQrToken())
                .inviteCode(generateInviteCode())
                .note(optionalText(request.getNote()))
                .build());

        return mapAttendee(attendee);
    }

    @Transactional
    public EventAttendeeResponse updateAttendee(Long eventId, Long attendeeId, EventAttendeeRequest request) {
        EventAttendee attendee = attendeeRepository.findByIdAndEventId(attendeeId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay khach moi"));
        CheckInSession session = request.getSessionId() != null ? ensureSession(eventId, request.getSessionId()) : null;

        attendee.setSession(session);
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
        CheckInSession session = request.getSessionId() != null ? ensureSession(eventId, request.getSessionId()) : null;
        EventAttendee attendee = resolveCheckInAttendee(eventId, request);

        if (session != null && attendee.getSession() != null && !attendee.getSession().getId().equals(session.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khach moi khong thuoc session check-in nay");
        }

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
        CheckInSession recordSession = session != null ? session : attendee.getSession();

        attendee.setStatus(AttendeeStatus.CHECKED_IN);
        attendee.setCheckedInAt(checkedInAt);
        attendee.setUpdatedAt(checkedInAt);
        attendeeRepository.save(attendee);

        CheckInRecord record = checkInRecordRepository.save(CheckInRecord.builder()
                .event(event)
                .attendee(attendee)
                .session(recordSession)
                .checkedInBy(checker)
                .checkedInAt(checkedInAt)
                .method(resolveCheckInMethod(request))
                .note(optionalText(request.getNote()))
                .build());

        return CheckInResponse.builder()
                .recordId(record.getId())
                .attendee(mapAttendee(attendee))
                .checkedInAt(record.getCheckedInAt())
                .message("Check-in thanh cong")
                .build();
    }

    @Transactional(readOnly = true)
    public byte[] buildAttendeeImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Khach moi");
            Row header = sheet.createRow(0);
            for (int i = 0; i < IMPORT_HEADERS.length; i++) {
                header.createCell(i).setCellValue(IMPORT_HEADERS[i]);
            }

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("Nguyen Van A");
            sample.createCell(1).setCellValue("vana@example.com");
            sample.createCell(2).setCellValue("0900000000");
            sample.createCell(3).setCellValue("GUEST");
            sample.createCell(4).setCellValue("INVITED");
            sample.createCell(5).setCellValue("Ghi chu ngan");

            for (int i = 0; i < IMPORT_HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Khong tao duoc file mau Excel", e);
        }
    }

    @Transactional
    public AttendeeImportResponse importAttendees(Long eventId, Long sessionId, MultipartFile file) {
        Event event = ensureEvent(eventId);
        CheckInSession session = ensureSession(eventId, sessionId);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Can chon file Excel");
        }

        int imported = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File Excel khong co sheet du lieu");
            }

            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isBlankRow(row)) {
                    continue;
                }

                try {
                    String fullName = requiredText(cellText(row.getCell(0)), "Ho ten khong duoc de trong");
                    EventAttendee attendee = EventAttendee.builder()
                            .event(event)
                            .session(session)
                            .fullName(fullName)
                            .email(optionalText(cellText(row.getCell(1))))
                            .phone(optionalText(cellText(row.getCell(2))))
                            .attendeeType(parseType(cellText(row.getCell(3)), AttendeeType.GUEST))
                            .status(parseStatus(cellText(row.getCell(4)), AttendeeStatus.INVITED))
                            .note(optionalText(cellText(row.getCell(5))))
                            .qrToken(generateQrToken())
                            .inviteCode(generateInviteCode())
                            .build();
                    attendeeRepository.save(attendee);
                    imported++;
                } catch (RuntimeException rowError) {
                    skipped++;
                    errors.add("Dong " + (rowIndex + 1) + ": " + rowError.getMessage());
                }
            }
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khong doc duoc file Excel", e);
        }

        return AttendeeImportResponse.builder()
                .importedCount(imported)
                .skippedCount(skipped)
                .errors(errors)
                .build();
    }

    @Transactional
    public AttendeeInviteEmailResponse sendAttendeeInvitation(Long eventId, Long attendeeId) {
        EventAttendee attendee = attendeeRepository.findByIdAndEventId(attendeeId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay khach moi"));

        List<String> errors = new ArrayList<>();
        if (attendee.getEmail() == null || attendee.getEmail().isBlank()) {
            errors.add(attendee.getFullName() + ": Khach moi chua co email");
            return AttendeeInviteEmailResponse.builder()
                    .requestedCount(1)
                    .sentCount(0)
                    .skippedCount(1)
                    .errors(errors)
                    .build();
        }

        invitationEmailService.sendInvitation(attendee);
        return AttendeeInviteEmailResponse.builder()
                .requestedCount(1)
                .sentCount(1)
                .skippedCount(0)
                .errors(errors)
                .build();
    }

    @Transactional
    public AttendeeInviteEmailResponse sendSessionInvitations(Long eventId, Long sessionId) {
        ensureSession(eventId, sessionId);
        Sort sort = Sort.by(Sort.Direction.ASC, "fullName").and(Sort.by(Sort.Direction.ASC, "id"));
        List<EventAttendee> attendees = attendeeRepository.findAllByEventIdAndSession_IdAndEmailIsNotNull(eventId, sessionId, sort);
        List<String> errors = new ArrayList<>();
        int sent = 0;
        int skipped = 0;

        for (EventAttendee attendee : attendees) {
            try {
                invitationEmailService.sendInvitation(attendee);
                sent++;
            } catch (RuntimeException e) {
                skipped++;
                errors.add(attendee.getFullName() + ": " + e.getMessage());
            }
        }

        return AttendeeInviteEmailResponse.builder()
                .requestedCount(attendees.size())
                .sentCount(sent)
                .skippedCount(skipped)
                .errors(errors)
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

        if (request.getInviteCode() != null && !request.getInviteCode().isBlank()) {
            EventAttendee attendee = attendeeRepository.findByInviteCode(request.getInviteCode().trim().toUpperCase())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ma moi khong hop le"));

            if (!attendee.getEvent().getId().equals(eventId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ma moi khong thuoc su kien nay");
            }

            return attendee;
        }

        if (request.getAttendeeId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Can qrToken, inviteCode hoac attendeeId de check-in");
        }

        return attendeeRepository.findByIdAndEventId(request.getAttendeeId(), eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay khach moi"));
    }

    private Event ensureEvent(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay su kien"));
    }

    private CheckInSession ensureSession(Long eventId, Long sessionId) {
        if (sessionId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Can session check-in");
        }

        return sessionRepository.findByIdAndEventId(sessionId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay session check-in"));
    }

    private CheckInSessionResponse mapSession(CheckInSession session) {
        return CheckInSessionResponse.builder()
                .id(session.getId())
                .eventId(session.getEvent().getId())
                .name(session.getName())
                .location(session.getLocation())
                .startsAt(session.getStartsAt())
                .endsAt(session.getEndsAt())
                .active(session.getActive())
                .attendeeCount(attendeeRepository.countBySession_Id(session.getId()))
                .checkedInCount(attendeeRepository.countBySession_IdAndStatus(session.getId(), AttendeeStatus.CHECKED_IN))
                .createdAt(session.getCreatedAt())
                .build();
    }

    private EventAttendeeResponse mapAttendee(EventAttendee attendee) {
        CheckInSession session = attendee.getSession();
        return EventAttendeeResponse.builder()
                .id(attendee.getId())
                .eventId(attendee.getEvent().getId())
                .sessionId(session != null ? session.getId() : null)
                .sessionName(session != null ? session.getName() : null)
                .fullName(attendee.getFullName())
                .email(attendee.getEmail())
                .phone(attendee.getPhone())
                .attendeeType(attendee.getAttendeeType())
                .status(attendee.getStatus())
                .qrToken(attendee.getQrToken())
                .inviteCode(attendee.getInviteCode())
                .checkInUrl("/events/" + attendee.getEvent().getId() + "/check-in?token=" + attendee.getQrToken() + "&code=" + attendee.getInviteCode())
                .note(attendee.getNote())
                .checkedInAt(attendee.getCheckedInAt())
                .createdAt(attendee.getCreatedAt())
                .build();
    }

    private boolean isBlankRow(Row row) {
        for (int i = 0; i < IMPORT_HEADERS.length; i++) {
            if (!cellText(row.getCell(i)).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String cellText(Cell cell) {
        if (cell == null) {
            return "";
        }

        cell.setCellType(CellType.STRING);
        return cell.getStringCellValue() == null ? "" : cell.getStringCellValue().trim();
    }

    private String generateQrToken() {
        byte[] bytes = new byte[16];
        SECURE_RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String generateInviteCode() {
        String code;
        do {
            StringBuilder builder = new StringBuilder("EF");
            for (int i = 0; i < 6; i++) {
                builder.append(INVITE_CODE_ALPHABET.charAt(SECURE_RANDOM.nextInt(INVITE_CODE_ALPHABET.length())));
            }
            code = builder.toString();
        } while (attendeeRepository.existsByInviteCode(code));
        return code;
    }

    private CheckInMethod resolveCheckInMethod(CheckInRequest request) {
        if (request.getQrToken() != null && !request.getQrToken().isBlank()) {
            return CheckInMethod.QR;
        }
        if (request.getInviteCode() != null && !request.getInviteCode().isBlank()) {
            return CheckInMethod.INVITE_CODE;
        }
        return CheckInMethod.MANUAL;
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

