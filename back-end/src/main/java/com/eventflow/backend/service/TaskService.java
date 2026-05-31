package com.eventflow.backend.service;

import com.eventflow.backend.dto.DepartmentTasksDTO;
import com.eventflow.backend.dto.PageResponse;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final EventRepository eventRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final EventMemberRepository eventMemberRepository;

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

        // Group tasks by department
        Map<com.eventflow.backend.entity.Department, List<Task>> grouped = tasks.stream()
                .collect(Collectors.groupingBy(Task::getDepartment));

        return grouped.entrySet().stream()
                .map(entry -> {
                    var dept = entry.getKey();
                    var deptTasks = entry.getValue().stream()
                            .map(this::mapToTaskResponse)
                            .collect(Collectors.toList());

                    return DepartmentTasksDTO.builder()
                            .departmentId(dept.getId())
                            .departmentName(dept.getName())
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
            String search) {

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
        User assignee = resolveAssignee(eventId, request.getAssigneeId());

        Task task = Task.builder()
                .event(event)
                .department(department)
                .assignee(assignee)
                .title(request.getTitle().trim())
                .status(parseStatusOrDefault(request.getStatus(), TaskStatus.TODO))
                .deadline(request.getDeadline())
                .build();

        return mapToTaskResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskResponseDTO updateTask(Long taskId, TaskRequestDTO request) {
        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));

        Long eventId = task.getEvent().getId();
        Department department = resolveDepartment(eventId, request.getDepartmentId());
        User assignee = resolveAssignee(eventId, request.getAssigneeId());

        task.setDepartment(department);
        task.setAssignee(assignee);
        task.setTitle(request.getTitle().trim());
        task.setStatus(parseStatusOrDefault(request.getStatus(), task.getStatus()));
        task.setDeadline(request.getDeadline());

        return mapToTaskResponse(taskRepository.save(task));
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
        task.setStatus(status);
        return taskRepository.save(task);
    }

    public TaskStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái task không được để trống");
        }

        return parseStatusOrDefault(status, null);
    }

    private Department resolveDepartment(Long eventId, Long departmentId) {
        return departmentRepository.findByIdAndEventId(departmentId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "departmentId không thuộc sự kiện"));
    }

    private User resolveAssignee(Long eventId, Long assigneeId) {
        if (assigneeId == null) {
            return null;
        }

        User user = userRepository.findById(assigneeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "assigneeId không hợp lệ"));

        if (!eventMemberRepository.existsByEventIdAndUserId(eventId, assigneeId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "assigneeId không thuộc sự kiện");
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
        return search.trim();
    }

    private Sort.Direction resolveDirection(String direction) {
        return "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
    }

    private String resolveSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return "deadline";
        }

        return switch (sort) {
            case "title", "status", "deadline", "createdAt" -> sort;
            case "department" -> "department.name";
            case "assignee" -> "assignee.name";
            default -> "deadline";
        };
    }

    private TaskResponseDTO mapToTaskResponse(Task task) {
        return TaskResponseDTO.builder()
                .id(task.getId())
                .eventId(task.getEvent().getId())
                .departmentId(task.getDepartment().getId())
                .departmentName(task.getDepartment().getName())
                .title(task.getTitle())
                .status(task.getStatus())
                .deadline(task.getDeadline())
                .assigneeId(task.getAssignee() != null ? task.getAssignee().getId() : null)
                .assigneeName(task.getAssignee() != null ? task.getAssignee().getName() : "Chưa phân công")
                .build();
    }
}
