package com.eventflow.backend.service;

import com.eventflow.backend.dto.DepartmentRequestDTO;
import com.eventflow.backend.dto.DepartmentResponseDTO;
import com.eventflow.backend.dto.EventMemberResponseDTO;
import com.eventflow.backend.dto.PageResponse;
import com.eventflow.backend.entity.Department;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.EventMember;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.DepartmentRepository;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final EventRepository eventRepository;
    private final EventMemberRepository eventMemberRepository;
    private final UserProfileService userProfileService;

    @Transactional(readOnly = true)
    public PageResponse<DepartmentResponseDTO> getDepartments(
            Long eventId,
            int page,
            int size,
            String sort,
            String direction,
            String search) {

        var pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(resolveDirection(direction), resolveSort(sort)));

        return PageResponse.from(departmentRepository.findAllByEventIdAndNameContainingIgnoreCase(
                        eventId,
                        search == null ? "" : search.trim(),
                        pageable)
                .map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public DepartmentResponseDTO getDepartment(Long eventId, Long departmentId) {
        return departmentRepository.findByIdAndEventId(departmentId, eventId)
                .map(this::mapToResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ban"));
    }

    @Transactional(readOnly = true)
    public List<EventMemberResponseDTO> getDepartmentMembers(Long eventId, Long departmentId) {
        assertDepartmentExists(eventId, departmentId);
        return eventMemberRepository.findAllByEventIdAndDepartmentIdWithUser(eventId, departmentId).stream()
                .map(this::mapMemberToResponse)
                .toList();
    }

    @Transactional
    public DepartmentResponseDTO createDepartment(Long eventId, DepartmentRequestDTO request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));

        String name = normalizeName(request.getName());
        if (departmentRepository.existsByEventIdAndName(eventId, name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tên ban đã tồn tại trong sự kiện");
        }
        EventMember leaderMember = resolveLeaderMember(eventId, request.getLeaderUserId());

        Department department = Department.builder()
                .event(event)
                .name(name)
                .description(normalizeOptionalText(request.getDescription()))
                .leader(leaderMember != null ? leaderMember.getUser() : null)
                .build();

        Department savedDepartment = saveDepartment(department);
        assignLeaderToDepartment(savedDepartment, leaderMember);
        return mapToResponse(savedDepartment);
    }

    @Transactional
    public DepartmentResponseDTO updateDepartment(Long eventId, Long departmentId, DepartmentRequestDTO request) {
        Department department = departmentRepository.findByIdAndEventId(departmentId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ban"));

        String name = normalizeName(request.getName());
        if (departmentRepository.existsByEventIdAndNameAndIdNot(eventId, name, departmentId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tên ban đã tồn tại trong sự kiện");
        }
        EventMember leaderMember = resolveLeaderMember(eventId, request.getLeaderUserId());

        department.setName(name);
        department.setDescription(normalizeOptionalText(request.getDescription()));
        department.setLeader(leaderMember != null ? leaderMember.getUser() : null);
        Department savedDepartment = saveDepartment(department);
        assignLeaderToDepartment(savedDepartment, leaderMember);
        return mapToResponse(savedDepartment);
    }

    @Transactional
    public EventMemberResponseDTO assignMember(Long eventId, Long departmentId, Long userId) {
        Department department = departmentRepository.findByIdAndEventId(departmentId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ban"));

        EventMember member = eventMemberRepository.findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Người dùng chưa là thành viên của sự kiện"));

        member.setDepartment(department);
        return mapMemberToResponse(eventMemberRepository.save(member));
    }

    @Transactional
    public void removeMember(Long eventId, Long departmentId, Long userId) {
        assertDepartmentExists(eventId, departmentId);
        EventMember member = eventMemberRepository.findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thành viên trong sự kiện"));

        if (member.getDepartment() == null || !member.getDepartment().getId().equals(departmentId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Thành viên không thuộc ban này");
        }

        member.setDepartment(null);
        eventMemberRepository.save(member);
    }

    @Transactional
    public void deleteDepartment(Long eventId, Long departmentId) {
        Department department = departmentRepository.findByIdAndEventId(departmentId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ban"));

        departmentRepository.delete(department);
    }

    private Department saveDepartment(Department department) {
        try {
            return departmentRepository.save(department);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tên ban đã tồn tại trong sự kiện", e);
        }
    }

    private String normalizeName(String name) {
        return name.trim();
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private EventMember resolveLeaderMember(Long eventId, Long leaderUserId) {
        if (leaderUserId == null) {
            return null;
        }

        return eventMemberRepository.findByEventIdAndUserId(eventId, leaderUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trưởng ban phải là thành viên của sự kiện"));
    }

    private void assignLeaderToDepartment(Department department, EventMember leaderMember) {
        if (leaderMember == null) {
            return;
        }

        leaderMember.setDepartment(department);
        eventMemberRepository.save(leaderMember);
    }

    private void assertDepartmentExists(Long eventId, Long departmentId) {
        if (!departmentRepository.existsByIdAndEventId(departmentId, eventId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ban");
        }
    }

    private Sort.Direction resolveDirection(String direction) {
        return "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
    }

    private String resolveSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return "name";
        }

        return switch (sort) {
            case "id", "name" -> sort;
            default -> "name";
        };
    }

    private DepartmentResponseDTO mapToResponse(Department department) {
        User leader = department.getLeader();
        return DepartmentResponseDTO.builder()
                .id(department.getId())
                .eventId(department.getEvent().getId())
                .name(department.getName())
                .description(department.getDescription())
                .leaderUserId(leader != null ? leader.getId() : null)
                .leaderName(leader != null ? leader.getName() : null)
                .leaderEmail(leader != null ? leader.getEmail() : null)
                .build();
    }

    private EventMemberResponseDTO mapMemberToResponse(EventMember member) {
        User user = member.getUser();
        Department department = member.getDepartment();
        return EventMemberResponseDTO.builder()
                .id(member.getId())
                .eventId(member.getEvent().getId())
                .userId(user.getId())
                .departmentId(department != null ? department.getId() : null)
                .departmentName(department != null ? department.getName() : null)
                .name(user.getName())
                .email(user.getEmail())
                .avatarUrl(userProfileService.avatarUrl(user.getId(), user.getAvatarStoragePath()))
                .telegramLinked(user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank())
                .role(member.getRole().name())
                .joinedAt(member.getJoinedAt())
                .accountCreatedAt(user.getCreatedAt())
                .build();
    }
}
