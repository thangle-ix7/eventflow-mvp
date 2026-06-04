package com.eventflow.backend.service;

import com.eventflow.backend.dto.EventMemberRequestDTO;
import com.eventflow.backend.dto.EventMemberResponseDTO;
import com.eventflow.backend.dto.EventMemberRoleUpdateRequest;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.EventMember;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.entity.UserRole;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EventMemberService {

    private final EventMemberRepository eventMemberRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final UserProfileService userProfileService;

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
    public EventMemberResponseDTO addMember(Long eventId, EventMemberRequestDTO request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));

        User user = userRepository.findByEmail(normalizeEmail(request.getEmail()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email này chưa có tài khoản EventFlow"));

        if (eventMemberRepository.existsByEventIdAndUserId(eventId, user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Người dùng đã là thành viên của sự kiện");
        }

        EventMember member = eventMemberRepository.save(EventMember.builder()
                .event(event)
                .user(user)
                .role(parseRoleOrDefault(request.getRole(), UserRole.MEMBER))
                .build());

        return mapToResponse(member);
    }

    @Transactional
    public EventMemberResponseDTO updateRole(Long eventId, Long userId, EventMemberRoleUpdateRequest request) {
        EventMember member = eventMemberRepository.findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thành viên trong sự kiện"));

        UserRole nextRole = parseRoleOrDefault(request.getRole(), null);
        assertEventKeepsLeader(eventId, member, nextRole);
        member.setRole(nextRole);
        return mapToResponse(eventMemberRepository.save(member));
    }

    @Transactional
    public void removeMember(Long eventId, Long userId, Long currentUserId) {
        EventMember member = eventMemberRepository.findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thành viên trong sự kiện"));

        if (member.getUser().getId().equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "LEADER không thể tự xóa mình khỏi sự kiện");
        }
        assertEventKeepsLeader(eventId, member, null);

        eventMemberRepository.delete(member);
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

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
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
}
