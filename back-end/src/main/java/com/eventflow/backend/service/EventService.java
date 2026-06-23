package com.eventflow.backend.service;

import com.eventflow.backend.dto.*;
import com.eventflow.backend.entity.*;
import com.eventflow.backend.repository.*;
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
    private final DepartmentRepository departmentRepository;
    private final TaskRepository taskRepository;
    private final SubscriptionService subscriptionService;

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
        subscriptionService.assertCanCreateEvent(userId);

        EventNature nature = request.getNature() != null ? request.getNature() : EventNature.NORMAL;

        Event event = eventRepository.save(Event.builder()
                .name(request.getName().trim())
                .description(normalizeOptionalText(request.getDescription()))
                .location(normalizeOptionalText(request.getLocation()))
                .eventDate(resolveStartTime(request))
                .endTime(resolveEndTime(request))
                .status(normalizeStatus(request.getStatus()))
                .nature(nature)
                .contextDescription(normalizeOptionalText(request.getContextDescription()))
                .eventType(normalizeEventType(request.getEventType()))
                .objective(normalizeOptionalText(request.getObjective()))
                .expectedAttendees(normalizeExpectedAttendees(request.getExpectedAttendees()))
                .scale(normalizeOptionalText(request.getScale()))
                .build());

        EventMember leader = eventMemberRepository.save(EventMember.builder()
                .event(event)
                .user(user)
                .role(UserRole.LEADER)
                .build());

        return mapToResponse(leader);
    }

    @Transactional
    public EventResponseDTO updateEvent(Long eventId, EventRequestDTO request, Long userId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));

        String nextStatus = normalizeStatus(request.getStatus());
        boolean activatingEvent = !"ACTIVE".equalsIgnoreCase(event.getStatus()) && "ACTIVE".equals(nextStatus);
        if (activatingEvent) {
            subscriptionService.assertCanCreateEvent(userId);
        }

        event.setName(request.getName().trim());
        event.setDescription(normalizeOptionalText(request.getDescription()));
        event.setLocation(normalizeOptionalText(request.getLocation()));
        event.setEventDate(resolveStartTime(request));
        event.setEndTime(resolveEndTime(request));
        event.setStatus(nextStatus);
        event.setContextDescription(normalizeOptionalText(request.getContextDescription()));
        event.setEventType(normalizeEventType(request.getEventType()));
        event.setObjective(normalizeOptionalText(request.getObjective()));
        event.setExpectedAttendees(normalizeExpectedAttendees(request.getExpectedAttendees()));
        event.setScale(normalizeOptionalText(request.getScale()));

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
                .contextDescription(coalesceText(request.getContextDescription(), request.getDescription()))
                .eventType(normalizeEventType(request.getEventType()))
                .objective(normalizeOptionalText(request.getObjective()))
                .expectedAttendees(normalizeExpectedAttendees(request.getExpectedAttendees()))
                .scale(normalizeOptionalText(request.getScale()))
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
        template.setContextDescription(coalesceText(request.getContextDescription(), request.getDescription()));
        template.setEventType(normalizeEventType(request.getEventType()));
        template.setObjective(normalizeOptionalText(request.getObjective()));
        template.setExpectedAttendees(normalizeExpectedAttendees(request.getExpectedAttendees()));
        template.setScale(normalizeOptionalText(request.getScale()));

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

    @Transactional
    public DepartmentResponseDTO addDepartmentToTemplate(Long templateId, TemplateDepartmentRequestDTO request) {
        Event template = eventRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy template"));

        if (template.getNature() != EventNature.TEMPLATE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sự kiện này không phải là Template");
        }

        Department dept = new Department();
        dept.setEvent(template);
        dept.setName(request.getName().trim());
        dept.setDescription(normalizeOptionalText(request.getDescription()));

        Department savedDept = departmentRepository.save(dept);

        return DepartmentResponseDTO.builder()
                .id(savedDept.getId())
                .name(savedDept.getName())
                .description(savedDept.getDescription())
                .build();
    }

    @Transactional
    public DepartmentResponseDTO updateTemplateDepartment(Long templateId, Long deptId, TemplateDepartmentRequestDTO request) {
        Department dept = departmentRepository.findById(deptId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng ban"));

        // Kiểm tra xem phòng ban này có đúng thuộc về template này không
        if (!dept.getEvent().getId().equals(templateId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phòng ban không thuộc về template này");
        }

        dept.setName(request.getName().trim());
        dept.setDescription(normalizeOptionalText(request.getDescription()));

        Department savedDept = departmentRepository.save(dept);

        return DepartmentResponseDTO.builder()
                .id(savedDept.getId())
                .name(savedDept.getName())
                .description(savedDept.getDescription())
                .build();
    }


    @Transactional
    public void deleteTemplateDepartment(Long templateId, Long deptId) {
        Department dept = departmentRepository.findById(deptId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng ban"));

        if (!dept.getEvent().getId().equals(templateId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phòng ban không thuộc về template này");
        }

        taskRepository.clearDepartmentIdByDepartmentId(deptId);
        departmentRepository.delete(dept);
    }

    @Transactional
    public TaskResponseDTO addTaskToTemplate(Long templateId, TemplateTaskRequestDTO request) {
        Event template = eventRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy template"));

        if (template.getNature() != EventNature.TEMPLATE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sự kiện này không phải là Template");
        }

        // Tạo Task rỗng không có deadline
        Task task = new Task();
        task.setEvent(template);
        task.setTitle(request.getTitle().trim()); // Gán title từ DTO vào name của Entity
        task.setDescription(normalizeOptionalText(request.getDescription()));

        // Map Priority
        if (request.getPriority() != null) {
            task.setPriority(TaskPriority.valueOf(request.getPriority().toUpperCase()));
        } else {
            task.setPriority(TaskPriority.MEDIUM);
        }

        // Set các giá trị mặc định cho Task
        task.setStatus(TaskStatus.TODO);
        task.setProgressPercentage(0);

        // Gán Task cho Phòng ban (Nếu có)
        if (request.getDepartmentId() != null) {
            Department dept = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng ban"));

            if (!dept.getEvent().getId().equals(templateId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phòng ban không thuộc về template này");
            }
            task.setDepartment(dept);
        }

        Task savedTask = taskRepository.save(task);

        return TaskResponseDTO.builder()
                .id(savedTask.getId())
                .eventId(templateId)
                .title(savedTask.getTitle())
                .description(savedTask.getDescription())
                .priority(savedTask.getPriority())
                .status(savedTask.getStatus())
                .progressPercentage(savedTask.getProgressPercentage())
                .departmentId(savedTask.getDepartment() != null ? savedTask.getDepartment().getId() : null)
                .departmentName(savedTask.getDepartment() != null ? savedTask.getDepartment().getName() : null)
                .build();
    }

    @Transactional
    public TaskResponseDTO updateTemplateTask(Long templateId, Long taskId, TemplateTaskRequestDTO request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));

        if (!task.getEvent().getId().equals(templateId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task không thuộc về template này");
        }

        task.setTitle(request.getTitle().trim());
        task.setDescription(normalizeOptionalText(request.getDescription()));

        if (request.getPriority() != null) {
            task.setPriority(TaskPriority.valueOf(request.getPriority().toUpperCase()));
        }

        // Cập nhật lại phòng ban phụ trách (nếu Admin đổi ban hoặc gỡ ban)
        if (request.getDepartmentId() != null) {
            Department dept = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng ban"));

            if (!dept.getEvent().getId().equals(templateId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phòng ban không thuộc về template này");
            }
            task.setDepartment(dept);
        } else {
            task.setDepartment(null); // Gỡ phòng ban ra khỏi task mẫu
        }

        Task savedTask = taskRepository.save(task);

        return TaskResponseDTO.builder()
                .id(savedTask.getId())
                .eventId(templateId)
                .title(savedTask.getTitle())
                .description(savedTask.getDescription())
                .priority(savedTask.getPriority())
                .status(savedTask.getStatus())
                .progressPercentage(savedTask.getProgressPercentage())
                .departmentId(savedTask.getDepartment() != null ? savedTask.getDepartment().getId() : null)
                .departmentName(savedTask.getDepartment() != null ? savedTask.getDepartment().getName() : null)
                .build();
    }

    @Transactional
    public void deleteTemplateTask(Long templateId, Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));

        if (!task.getEvent().getId().equals(templateId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task không thuộc về template này");
        }

        taskRepository.delete(task);
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
        if (!endTime.isAfter(startTime)) {
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

    private String coalesceText(String preferred, String fallback) {
        String normalizedPreferred = normalizeOptionalText(preferred);
        return normalizedPreferred != null ? normalizedPreferred : normalizeOptionalText(fallback);
    }

    private String normalizeEventType(String eventType) {
        String normalized = normalizeOptionalText(eventType);
        return normalized != null ? normalized.toUpperCase() : null;
    }

    private Integer normalizeExpectedAttendees(Integer expectedAttendees) {
        if (expectedAttendees == null) {
            return null;
        }
        return Math.max(expectedAttendees, 0);
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
            case "createdAt", "createdDate" -> "createdAt";
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
                .contextDescription(event.getContextDescription())
                .eventType(event.getEventType())
                .objective(event.getObjective())
                .expectedAttendees(event.getExpectedAttendees())
                .scale(event.getScale())
                .role(role != null ? role.name() : null)
                .departmentId(departmentId)
                .departmentName(departmentName)
                .createdAt(event.getCreatedAt())
                .build();
    }
}
