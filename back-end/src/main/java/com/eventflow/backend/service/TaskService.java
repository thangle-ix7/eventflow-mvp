package com.eventflow.backend.service;

import com.eventflow.backend.dto.DepartmentTasksDTO;
import com.eventflow.backend.dto.PageResponse;
import com.eventflow.backend.dto.TaskAssignmentRequest;
import com.eventflow.backend.dto.TaskRequestDTO;
import com.eventflow.backend.dto.TaskResponseDTO;
import com.eventflow.backend.entity.Department;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.Task;
import com.eventflow.backend.entity.TaskStatus;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.DepartmentRepository;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.TaskRepository;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final EventRepository eventRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final EventMemberRepository eventMemberRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public Long getEventIdByTaskId(Long taskId) {
        return taskRepository.findEventIdByTaskId(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
    }

    @Transactional(readOnly = true)
    public List<DepartmentTasksDTO> getTasksByEvent(
            Long eventId,
            String status,
            Long departmentId,
            Long assigneeId,
            String search,
            String sort,
            String direction) {

        List<Task> tasks = taskRepository.findAllByEventIdWithFilters(
                eventId,
                parseOptionalStatus(status),
                departmentId,
                assigneeId,
                normalizeSearch(search),
                Sort.by(resolveDirection(direction), resolveSort(sort)));

        Map<Department, List<Task>> grouped = new LinkedHashMap<>();
        for (Task task : tasks) {
            grouped.computeIfAbsent(task.getDepartment(), key -> new java.util.ArrayList<>()).add(task);
        }

        return grouped.entrySet().stream()
                .map(entry -> {
                    var dept = entry.getKey();
                    var deptTasks = entry.getValue().stream()
                            .map(this::mapToTaskResponse)
                            .collect(Collectors.toList());

                    return DepartmentTasksDTO.builder()
                            .departmentId(dept != null ? dept.getId() : null)
                            .departmentName(dept != null ? dept.getName() : "Chưa gán ban")
                            .tasks(deptTasks)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PageResponse<TaskResponseDTO> getTaskPageByEvent(
            Long eventId,
            int page,
            int size,
            String sort,
            String direction,
            String status,
            Long departmentId,
            Long assigneeId,
            String search,
            LocalDate fromDate,
            LocalDate toDate) {

        var pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(resolveDirection(direction), resolveSort(sort)));

        return PageResponse.from(taskRepository.findPageByEventIdWithFilters(
                        eventId,
                        parseOptionalStatus(status),
                        departmentId,
                        assigneeId,
                        normalizeSearch(search),
                        startOfDay(fromDate),
                        endExclusive(toDate),
                        pageable)
                .map(this::mapToTaskResponse));
    }

    @Transactional(readOnly = true)
    public TaskResponseDTO getTask(Long taskId) {
        return taskRepository.findByIdWithDetails(taskId)
                .map(this::mapToTaskResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
    }

    @Transactional
    public TaskResponseDTO createTask(Long eventId, TaskRequestDTO request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));

        Department department = resolveDepartment(eventId, request.getDepartmentId());
        User assignee = resolveAssignee(eventId, request.getAssigneeId(), department);

        TaskStatus status = parseStatusOrDefault(request.getStatus(), TaskStatus.TODO);

        Task task = Task.builder()
                .event(event)
                .department(department)
                .assignee(assignee)
                .title(request.getTitle().trim())
                .status(status)
                .deadline(request.getDeadline())
                .progressPercentage(resolveProgress(request.getProgressPercentage(), status, 0))
                .build();

        Task savedTask = taskRepository.save(task);
        recordStatusHistory(savedTask);
        return mapToTaskResponse(savedTask);
    }

    @Transactional
    public TaskResponseDTO updateTask(Long taskId, TaskRequestDTO request) {
        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));

        Long eventId = task.getEvent().getId();
        TaskStatus previousStatus = task.getStatus();
        Department department = resolveDepartment(eventId, request.getDepartmentId());
        User assignee = resolveAssignee(eventId, request.getAssigneeId(), department);

        task.setDepartment(department);
        task.setAssignee(assignee);
        task.setTitle(request.getTitle().trim());
        TaskStatus status = parseStatusOrDefault(request.getStatus(), task.getStatus());
        task.setStatus(status);
        task.setDeadline(request.getDeadline());
        task.setProgressPercentage(resolveProgress(
                request.getProgressPercentage(),
                status,
                task.getProgressPercentage()));

        Task savedTask = taskRepository.save(task);
        if (previousStatus != status) {
            recordStatusHistory(savedTask);
        }
        return mapToTaskResponse(savedTask);
    }

    @Transactional
    public void deleteTask(Long taskId) {
        if (!taskRepository.existsById(taskId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task");
        }

        taskRepository.deleteById(taskId);
    }

    @Transactional
    public Task updateStatus(Long taskId, TaskStatus status) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        TaskStatus previousStatus = task.getStatus();
        task.setStatus(status);
        if (status == TaskStatus.DONE) {
            task.setProgressPercentage(100);
        }
        Task savedTask = taskRepository.save(task);
        if (previousStatus != status) {
            recordStatusHistory(savedTask);
        }
        return savedTask;
    }

    @Transactional
    public TaskResponseDTO updateAssignment(Long taskId, TaskAssignmentRequest request) {
        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));

        Long eventId = task.getEvent().getId();
        Department department = resolveDepartment(eventId, request.getDepartmentId());
        task.setDepartment(department);
        task.setAssignee(resolveAssignee(eventId, request.getAssigneeId(), department));

        return mapToTaskResponse(taskRepository.save(task));
    }

    public TaskStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái task không được để trống");
        }

        return parseStatusOrDefault(status, null);
    }

    private Department resolveDepartment(Long eventId, Long departmentId) {
        if (departmentId == null) {
            return null;
        }

        return departmentRepository.findByIdAndEventId(departmentId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "departmentId không thuộc sự kiện"));
    }

    private User resolveAssignee(Long eventId, Long assigneeId, Department department) {
        if (assigneeId == null) {
            return null;
        }

        if (department == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phải chọn department trước khi gán assignee");
        }

        User user = userRepository.findById(assigneeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "assigneeId không hợp lệ"));

        if (!eventMemberRepository.existsByEventIdAndUserId(eventId, assigneeId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "assigneeId không thuộc sự kiện");
        }

        if (department != null && !eventMemberRepository.existsByEventIdAndUserIdAndDepartmentId(
                eventId,
                assigneeId,
                department.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "assigneeId không thuộc department đã chọn");
        }

        return user;
    }

    private TaskStatus parseStatusOrDefault(String status, TaskStatus defaultStatus) {
        if (status == null || status.isBlank()) {
            return defaultStatus;
        }

        try {
            return TaskStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái task không hợp lệ", e);
        }
    }

    private TaskStatus parseOptionalStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return parseStatusOrDefault(status, null);
    }

    private String normalizeSearch(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        return "%" + search.trim().toLowerCase() + "%";
    }

    private LocalDateTime startOfDay(LocalDate date) {
        return date != null ? date.atStartOfDay() : null;
    }

    private LocalDateTime endExclusive(LocalDate date) {
        return date != null ? date.plusDays(1).atStartOfDay() : null;
    }

    private Sort.Direction resolveDirection(String direction) {
        return "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
    }

    private String resolveSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return "deadline";
        }

        return switch (sort) {
            case "title", "status", "deadline", "createdAt", "progressPercentage" -> sort;
            case "department" -> "department.name";
            case "assignee" -> "assignee.name";
            default -> "deadline";
        };
    }

    private TaskResponseDTO mapToTaskResponse(Task task) {
        return TaskResponseDTO.builder()
                .id(task.getId())
                .eventId(task.getEvent().getId())
                .departmentId(task.getDepartment() != null ? task.getDepartment().getId() : null)
                .departmentName(task.getDepartment() != null ? task.getDepartment().getName() : "Chưa gán ban")
                .title(task.getTitle())
                .status(task.getStatus())
                .deadline(task.getDeadline())
                .progressPercentage(task.getProgressPercentage() != null ? task.getProgressPercentage() : 0)
                .assigneeId(task.getAssignee() != null ? task.getAssignee().getId() : null)
                .assigneeName(task.getAssignee() != null ? task.getAssignee().getName() : "Chưa phân công")
                .build();
    }

    private Integer resolveProgress(Integer requestedProgress, TaskStatus status, Integer defaultProgress) {
        if (status == TaskStatus.DONE) {
            return 100;
        }

        if (requestedProgress == null) {
            return defaultProgress != null ? defaultProgress : 0;
        }

        if (requestedProgress < 0 || requestedProgress > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tiến độ phải nằm trong khoảng 0-100");
        }

        return requestedProgress;
    }

    private void recordStatusHistory(Task task) {
        jdbcTemplate.update("""
                INSERT INTO task_status_history (task_id, event_id, department_id, status, changed_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                task.getId(),
                task.getEvent().getId(),
                task.getDepartment() != null ? task.getDepartment().getId() : null,
                task.getStatus().name());
    }
}
