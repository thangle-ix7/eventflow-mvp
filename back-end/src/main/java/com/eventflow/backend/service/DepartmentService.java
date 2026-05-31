package com.eventflow.backend.service;

import com.eventflow.backend.dto.DepartmentRequestDTO;
import com.eventflow.backend.dto.DepartmentResponseDTO;
import com.eventflow.backend.dto.PageResponse;
import com.eventflow.backend.entity.Department;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.repository.DepartmentRepository;
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

    @Transactional
    public DepartmentResponseDTO createDepartment(Long eventId, DepartmentRequestDTO request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));

        String name = normalizeName(request.getName());
        if (departmentRepository.existsByEventIdAndName(eventId, name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tên ban đã tồn tại trong sự kiện");
        }

        Department department = Department.builder()
                .event(event)
                .name(name)
                .build();

        return mapToResponse(saveDepartment(department));
    }

    @Transactional
    public DepartmentResponseDTO updateDepartment(Long eventId, Long departmentId, DepartmentRequestDTO request) {
        Department department = departmentRepository.findByIdAndEventId(departmentId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ban"));

        String name = normalizeName(request.getName());
        if (departmentRepository.existsByEventIdAndNameAndIdNot(eventId, name, departmentId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tên ban đã tồn tại trong sự kiện");
        }

        department.setName(name);
        return mapToResponse(saveDepartment(department));
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
        return DepartmentResponseDTO.builder()
                .id(department.getId())
                .eventId(department.getEvent().getId())
                .name(department.getName())
                .build();
    }
}
