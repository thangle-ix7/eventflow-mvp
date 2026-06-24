package com.eventflow.backend.service;

import com.eventflow.backend.dto.EventInvitationConfirmResponse;
import com.eventflow.backend.dto.EventInvitationResponseDTO;
import com.eventflow.backend.dto.EventMemberBulkInviteItemDTO;
import com.eventflow.backend.dto.EventMemberBulkInviteRequestDTO;
import com.eventflow.backend.dto.EventMemberBulkInviteResponseDTO;
import com.eventflow.backend.dto.EventMemberRequestDTO;
import com.eventflow.backend.dto.EventMemberResponseDTO;
import com.eventflow.backend.dto.EventMemberRoleUpdateRequest;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.EventInvitation;
import com.eventflow.backend.entity.EventInvitationStatus;
import com.eventflow.backend.entity.EventMember;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.entity.UserRole;
import com.eventflow.backend.repository.EventInvitationRepository;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.UserRepository;
import com.eventflow.backend.util.SecureTokenUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class EventMemberService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final EventMemberRepository eventMemberRepository;
    private final EventInvitationRepository eventInvitationRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final UserProfileService userProfileService;
    private final AuthEmailService authEmailService;
    private final SubscriptionService subscriptionService;

    @Value("${eventflow.invitation.token-ttl-minutes:10080}")
    private long invitationTokenTtlMinutes;

    @Transactional(readOnly = true)
    public List<EventMemberResponseDTO> getMembers(Long eventId) {
        return eventMemberRepository.findAllByEventIdWithUser(eventId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EventMemberResponseDTO> getMembersVisibleToMember(Long eventId, Long currentUserId) {
        EventMember currentMember = eventMemberRepository.findMemberDetailByEventIdAndUserId(eventId, currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn chưa thuộc sự kiện này"));
        if (currentMember.getDepartment() == null) {
            return List.of(mapToResponse(currentMember));
        }
        return eventMemberRepository.findAllByEventIdAndDepartmentIdWithUser(eventId, currentMember.getDepartment().getId()).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventMemberResponseDTO getMember(Long eventId, Long userId) {
        return eventMemberRepository.findMemberDetailByEventIdAndUserId(eventId, userId)
                .map(this::mapToResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thành viên trong sự kiện"));
    }

    @Transactional(readOnly = true)
    public EventMemberResponseDTO getMemberVisibleToMember(Long eventId, Long targetUserId, Long currentUserId) {
        EventMember currentMember = eventMemberRepository.findMemberDetailByEventIdAndUserId(eventId, currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn chưa thuộc sự kiện này"));
        if (currentUserId.equals(targetUserId)) {
            return mapToResponse(currentMember);
        }
        if (currentMember.getDepartment() == null
                || !eventMemberRepository.existsByEventIdAndUserIdAndDepartmentId(
                eventId,
                targetUserId,
                currentMember.getDepartment().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn chỉ có thể xem thành viên trong ban mình");
        }
        return getMember(eventId, targetUserId);
    }

    @Transactional
    public EventInvitationResponseDTO addMember(Long eventId, EventMemberRequestDTO request, Long invitedByUserId) {
        Event event = getEventOrThrow(eventId);
        assertEventAcceptsChanges(event, "Sự kiện đã đóng nên không thể mời thêm thành viên");
        User invitedBy = getInviterOrThrow(invitedByUserId);
        return mapInvitationToResponse(createInvitation(event, normalizeEmail(request.getEmail()), request.getRole(), invitedBy));
    }

    @Transactional
    public EventMemberBulkInviteResponseDTO bulkInviteMembers(Long eventId, EventMemberBulkInviteRequestDTO request, Long invitedByUserId) {
        Event event = getEventOrThrow(eventId);
        assertEventAcceptsChanges(event, "Sự kiện đã đóng nên không thể mời thêm thành viên");
        User invitedBy = getInviterOrThrow(invitedByUserId);
        UserRole role = parseRoleOrDefault(request.getRole(), UserRole.MEMBER);
        Set<String> seenEmails = new LinkedHashSet<>();
        List<EventMemberBulkInviteItemDTO> results = new ArrayList<>();

        for (String rawEmail : request.getEmails()) {
            String email = normalizeEmail(rawEmail);
            if (email.isBlank()) {
                results.add(failedInvite(rawEmail, "Email không được để trống"));
                continue;
            }
            if (!EMAIL_PATTERN.matcher(email).matches() || email.length() > 100) {
                results.add(failedInvite(email, "Email không đúng định dạng"));
                continue;
            }
            if (!seenEmails.add(email)) {
                results.add(failedInvite(email, "Email bị trùng trong danh sách"));
                continue;
            }

            try {
                EventInvitation invitation = createInvitation(event, email, role.name(), invitedBy);
                results.add(EventMemberBulkInviteItemDTO.builder()
                        .email(email)
                        .status("SENT")
                        .message("Đã gửi lời mời")
                        .invitation(mapInvitationToResponse(invitation))
                        .build());
            } catch (ResponseStatusException ex) {
                results.add(failedInvite(email, ex.getReason() != null ? ex.getReason() : "Không gửi được lời mời"));
            } catch (RuntimeException ex) {
                results.add(failedInvite(email, "Không gửi được lời mời"));
            }
        }

        int sentCount = (int) results.stream().filter(result -> "SENT".equals(result.getStatus())).count();
        return EventMemberBulkInviteResponseDTO.builder()
                .total(results.size())
                .sentCount(sentCount)
                .failedCount(results.size() - sentCount)
                .results(results)
                .build();
    }

    @Transactional(readOnly = true)
    public List<EventInvitationResponseDTO> getInvitations(Long eventId) {
        return eventInvitationRepository.findAllByEventIdWithUsers(eventId).stream()
                .map(this::mapInvitationToResponse)
                .toList();
    }

    @Transactional
    public EventInvitationResponseDTO cancelInvitation(Long eventId, Long invitationId) {
        EventInvitation invitation = eventInvitationRepository.findByEventIdAndIdWithUsers(eventId, invitationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lời mời"));
        assertEventAcceptsChanges(invitation.getEvent(), "Sự kiện đã đóng nên không thể hủy lời mời");
        if (invitation.getStatus() != EventInvitationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ có thể hủy lời mời đang chờ xác nhận");
        }
        invitation.setStatus(EventInvitationStatus.CANCELLED);
        return mapInvitationToResponse(eventInvitationRepository.save(invitation));
    }

    @Transactional
    public EventInvitationConfirmResponse confirmInvitation(String token) {
        EventInvitation invitation = eventInvitationRepository.findActiveByTokenHash(
                        SecureTokenUtil.sha256Hex(token),
                        EventInvitationStatus.PENDING,
                        LocalDateTime.now())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lời mời không hợp lệ hoặc đã hết hạn"));

        Event event = invitation.getEvent();
        User user = invitation.getInvitee();
        assertEventAcceptsChanges(event, "Sự kiện đã đóng nên không thể xác nhận lời mời");

        if (!eventMemberRepository.existsByEventIdAndUserId(event.getId(), user.getId())) {
            subscriptionService.assertCanAddMember(event.getId());
            eventMemberRepository.save(EventMember.builder()
                    .event(event)
                    .user(user)
                    .role(invitation.getRole())
                    .build());
        }

        invitation.setStatus(EventInvitationStatus.ACCEPTED);
        invitation.setAcceptedAt(LocalDateTime.now());
        eventInvitationRepository.save(invitation);

        return new EventInvitationConfirmResponse("Đã xác nhận tham gia sự kiện", event.getId(), event.getName());
    }

    @Transactional
    public EventMemberResponseDTO updateRole(Long eventId, Long userId, EventMemberRoleUpdateRequest request) {
        EventMember member = eventMemberRepository.findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thành viên trong sự kiện"));
        assertEventAcceptsChanges(member.getEvent(), "Sự kiện đã đóng nên không thể đổi vai trò thành viên");

        UserRole nextRole = parseRoleOrDefault(request.getRole(), null);
        assertEventKeepsLeader(eventId, member, nextRole);
        member.setRole(nextRole);
        return mapToResponse(eventMemberRepository.save(member));
    }

    @Transactional
    public void removeMember(Long eventId, Long userId, Long currentUserId) {
        EventMember member = eventMemberRepository.findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thành viên trong sự kiện"));
        assertEventAcceptsChanges(member.getEvent(), "Sự kiện đã đóng nên không thể xóa thành viên");

        if (member.getUser().getId().equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "LEADER không thể tự xóa mình khỏi sự kiện");
        }
        assertEventKeepsLeader(eventId, member, null);

        eventMemberRepository.delete(member);
    }

    private Event getEventOrThrow(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));
    }

    private User getInviterOrThrow(Long invitedByUserId) {
        return userRepository.findById(invitedByUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người gửi lời mời"));
    }

    private EventInvitation createInvitation(Event event, String email, String role, User invitedBy) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email này chưa có tài khoản EventFlow"));

        Long eventId = event.getId();
        if (eventMemberRepository.existsByEventIdAndUserId(eventId, user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Người dùng đã là thành viên của sự kiện");
        }
        subscriptionService.assertCanAddMember(eventId);

        LocalDateTime now = LocalDateTime.now();
        eventInvitationRepository.findByEventIdAndInviteeIdAndStatus(eventId, user.getId(), EventInvitationStatus.PENDING)
                .ifPresent(invitation -> {
                    if (invitation.getExpiresAt().isAfter(now)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Lời mời đang chờ xác nhận");
                    }
                    invitation.setStatus(EventInvitationStatus.CANCELLED);
                    eventInvitationRepository.save(invitation);
                });

        String token = SecureTokenUtil.generateToken();
        EventInvitation invitation = EventInvitation.builder()
                .event(event)
                .invitee(user)
                .invitedBy(invitedBy)
                .email(user.getEmail())
                .role(parseRoleOrDefault(role, UserRole.MEMBER))
                .status(EventInvitationStatus.PENDING)
                .tokenHash(SecureTokenUtil.sha256Hex(token))
                .expiresAt(now.plusMinutes(invitationTokenTtlMinutes))
                .build();

        authEmailService.sendEventInvitationEmail(user.getEmail(), token, event.getName(), invitedBy.getName());
        return eventInvitationRepository.save(invitation);
    }

    private EventMemberBulkInviteItemDTO failedInvite(String email, String message) {
        return EventMemberBulkInviteItemDTO.builder()
                .email(email == null ? "" : email.trim())
                .status("FAILED")
                .message(message)
                .build();
    }

    private EventMemberResponseDTO mapToResponse(EventMember member) {
        User user = member.getUser();
        return EventMemberResponseDTO.builder()
                .id(member.getId())
                .eventId(member.getEvent().getId())
                .userId(user.getId())
                .departmentId(member.getDepartment() != null ? member.getDepartment().getId() : null)
                .departmentName(member.getDepartment() != null ? member.getDepartment().getName() : null)
                .name(user.getName())
                .email(user.getEmail())
                .avatarUrl(userProfileService.avatarUrl(user.getId(), user.getAvatarStoragePath()))
                .telegramLinked(user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank())
                .role(member.getRole().name())
                .joinedAt(member.getJoinedAt())
                .accountCreatedAt(user.getCreatedAt())
                .build();
    }

    private EventInvitationResponseDTO mapInvitationToResponse(EventInvitation invitation) {
        return EventInvitationResponseDTO.builder()
                .id(invitation.getId())
                .eventId(invitation.getEvent().getId())
                .eventName(invitation.getEvent().getName())
                .inviteeUserId(invitation.getInvitee().getId())
                .email(invitation.getEmail())
                .role(invitation.getRole().name())
                .status(resolveInvitationStatus(invitation))
                .expiresAt(invitation.getExpiresAt())
                .build();
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private String resolveInvitationStatus(EventInvitation invitation) {
        if (invitation.getStatus() == EventInvitationStatus.PENDING
                && invitation.getExpiresAt() != null
                && !invitation.getExpiresAt().isAfter(LocalDateTime.now())) {
            return "EXPIRED";
        }
        return invitation.getStatus().name();
    }

    private UserRole parseRoleOrDefault(String role, UserRole defaultRole) {
        if (role == null || role.isBlank()) {
            return defaultRole;
        }

        try {
            return UserRole.valueOf(role.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "role không hợp lệ", e);
        }
    }

    private void assertEventKeepsLeader(Long eventId, EventMember member, UserRole nextRole) {
        if (member.getRole() != UserRole.LEADER || nextRole == UserRole.LEADER) {
            return;
        }
        if (eventMemberRepository.countByEventIdAndRole(eventId, UserRole.LEADER) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sự kiện cần giữ ít nhất một leader");
        }
    }

    private void assertEventAcceptsChanges(Event event, String message) {
        String status = event.getStatus();
        if ("CANCELLED".equalsIgnoreCase(status) || "CANCELED".equalsIgnoreCase(status) || "DONE".equalsIgnoreCase(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }
}

