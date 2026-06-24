package com.eventflow.backend.service;

import com.eventflow.backend.dto.DepartmentTasksDTO;
import com.eventflow.backend.dto.PageResponse;
import com.eventflow.backend.dto.TaskAssignmentRequest;
import com.eventflow.backend.dto.TaskRequestDTO;
import com.eventflow.backend.dto.TaskResponseDTO;
import com.eventflow.backend.dto.TaskReviewRequest;
import com.eventflow.backend.dto.TaskReviewResponseDTO;
import com.eventflow.backend.dto.TaskWorkUpdateRequest;
import com.eventflow.backend.entity.Department;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.Milestone;
import com.eventflow.backend.entity.Task;
import com.eventflow.backend.entity.TaskPriority;
import com.eventflow.backend.entity.TaskReview;
import com.eventflow.backend.entity.TaskStatus;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.DepartmentRepository;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.MilestoneRepository;
import com.eventflow.backend.repository.TaskRepository;
import com.eventflow.backend.repository.TaskReviewRepository;
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
    private final MilestoneRepository milestoneRepository;
    private final UserRepository userRepository;
    private final EventMemberRepository eventMemberRepository;
    private final TaskReviewRepository taskReviewRepository;
    private final JdbcTemplate jdbcTemplate;
    private final NotificationWorkflowService notificationWorkflowService;

    @Transactional(readOnly = true)
    public Long getEventIdByTaskId(Long taskId) {
        return taskRepository.findEventIdByTaskId(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
    }

    @Transactional(readOnly = true)
    public List<DepartmentTasksDTO> getTasksByEvent(
            Long eventId,
            String status,
            String priority,
            Long departmentId,
            Long milestoneId,
            Long assigneeId,
            String search,
            String sort,
            String direction,
            String deadlineStatus,
            boolean includeSubtasks) {

        LocalDateTime now = LocalDateTime.now();
        List<Task> tasks = taskRepository.findAllByEventIdWithFilters(
                eventId,
                parseOptionalStatus(status),
                parseOptionalPriority(priority),
                departmentId,
                milestoneId,
                assigneeId,
                normalizeSearch(search),
                normalizeDeadlineStatus(deadlineStatus),
                now,
                includeSubtasks,
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
            String priority,
            Long departmentId,
            Long milestoneId,
            Long assigneeId,
            String search,
            LocalDate fromDate,
            LocalDate toDate,
            String deadlineStatus,
            boolean includeSubtasks) {

        var pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(resolveDirection(direction), resolveSort(sort)));

        TaskStatus parsedStatus = parseOptionalStatus(status);
        TaskPriority parsedPriority = parseOptionalPriority(priority);
        String searchPattern = normalizeSearch(search);
        String normalizedDeadlineStatus = normalizeDeadlineStatus(deadlineStatus);
        LocalDateTime now = LocalDateTime.now();
        var taskPage = fromDate != null && toDate != null
                ? taskRepository.findPageByEventIdWithFiltersAndDeadlineRange(
                        eventId,
                        parsedStatus,
                        parsedPriority,
                        departmentId,
                        milestoneId,
                        assigneeId,
                        searchPattern,
                        normalizedDeadlineStatus,
                        now,
                        includeSubtasks,
                        startOfDay(fromDate),
                        endExclusive(toDate),
                        pageable)
                : taskRepository.findPageByEventIdWithFilters(
                        eventId,
                        parsedStatus,
                        parsedPriority,
                        departmentId,
                        milestoneId,
                        assigneeId,
                        searchPattern,
                        normalizedDeadlineStatus,
                        now,
                        includeSubtasks,
                        pageable);

        return PageResponse.from(taskPage.map(this::mapToTaskResponse));
    }

    @Transactional(readOnly = true)
    public TaskResponseDTO getTask(Long taskId) {
        return taskRepository.findByIdWithDetails(taskId)
                .map(this::mapToTaskResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
    }

    @Transactional(readOnly = true)
    public PageResponse<TaskResponseDTO> getSubtasks(Long parentTaskId, int page, int size) {
        if (!taskRepository.existsById(parentTaskId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task cha");
        }

        var pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.ASC, "createdAt").and(Sort.by(Sort.Direction.ASC, "id")));

        return PageResponse.from(taskRepository.findPageByParentIdWithDetails(parentTaskId, pageable)
                .map(this::mapToTaskResponse));
    }

    @Transactional
    public TaskResponseDTO createTask(Long eventId, TaskRequestDTO request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));
        assertEventAcceptsChanges(event);

        Department department = resolveDepartment(eventId, request.getDepartmentId());
        User assignee = resolveAssignee(eventId, request.getAssigneeId(), department);
        Milestone milestone = resolveMilestone(eventId, request.getMilestoneId());

        TaskStatus status = parseStatusOrDefault(request.getStatus(), TaskStatus.TODO);
        TaskPriority priority = parsePriorityOrDefault(request.getPriority(), TaskPriority.MEDIUM);
        validateTaskDeadlineWithinEvent(request.getDeadline(), event);

        Task task = Task.builder()
                .event(event)
                .department(department)
                .assignee(assignee)
                .milestone(milestone)
                .title(request.getTitle().trim())
                .description(normalizeOptionalText(request.getDescription()))
                .status(status)
                .priority(priority)
                .deadline(request.getDeadline())
                .reminderOffsetMinutes(resolveReminderOffsetMinutes(request.getReminderOffsetMinutes()))
                .progressPercentage(resolveProgress(request.getProgressPercentage(), status, 0))
                .build();

        Task savedTask = taskRepository.save(task);
        recordStatusHistory(savedTask);
        notificationWorkflowService.notifyTaskAssigned(savedTask);
        return mapToTaskResponse(savedTask);
    }

    @Transactional
    public TaskResponseDTO createSubtask(Long parentTaskId, TaskRequestDTO request) {
        Task parentTask = taskRepository.findByIdWithDetails(parentTaskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task cha"));
        assertEventAcceptsChanges(parentTask.getEvent());
        if (parentTask.getParent() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ task lớn mới được chia subtask");
        }

        TaskStatus status = parseStatusOrDefault(request.getStatus(), TaskStatus.TODO);
        TaskPriority priority = parsePriorityOrDefault(request.getPriority(), TaskPriority.MEDIUM);
        validateTaskDeadlineWithinEvent(request.getDeadline(), parentTask.getEvent());
        User assignee = resolveAssignee(parentTask.getEvent().getId(), request.getAssigneeId(), parentTask.getDepartment());

        Task subtask = Task.builder()
                .event(parentTask.getEvent())
                .parent(parentTask)
                .department(parentTask.getDepartment())
                .assignee(assignee)
                .milestone(parentTask.getMilestone())
                .title(request.getTitle().trim())
                .description(normalizeOptionalText(request.getDescription()))
                .status(status)
                .priority(priority)
                .deadline(request.getDeadline())
                .reminderOffsetMinutes(resolveReminderOffsetMinutes(request.getReminderOffsetMinutes()))
                .progressPercentage(progressFromSubtaskStatus(status))
                .build();

        Task savedTask = taskRepository.save(subtask);
        recordStatusHistory(savedTask);
        notificationWorkflowService.notifyTaskAssigned(savedTask);
        recalculateParentProgress(parentTask);
        return mapToTaskResponse(savedTask);
    }

    @Transactional
    public TaskResponseDTO updateTask(Long taskId, TaskRequestDTO request) {
        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        assertEventAcceptsChanges(task.getEvent());

        Long eventId = task.getEvent().getId();
        TaskStatus previousStatus = task.getStatus();
        Long previousAssigneeId = task.getAssignee() != null ? task.getAssignee().getId() : null;
        LocalDateTime previousDeadline = task.getDeadline();
        String previousTitle = task.getTitle();
        Department department = task.getParent() != null
                ? task.getParent().getDepartment()
                : resolveDepartment(eventId, request.getDepartmentId());
        User assignee = resolveAssignee(eventId, request.getAssigneeId(), department);
        Milestone milestone = task.getParent() != null
                ? task.getParent().getMilestone()
                : resolveMilestone(eventId, request.getMilestoneId());
        validateTaskDeadlineWithinEvent(request.getDeadline(), task.getEvent());
        boolean hasSubtasks = taskRepository.existsByParentId(taskId);

        task.setDepartment(department);
        task.setAssignee(assignee);
        task.setMilestone(milestone);
        task.setTitle(request.getTitle().trim());
        task.setDescription(normalizeOptionalText(request.getDescription()));
        TaskStatus status = hasSubtasks ? task.getStatus() : parseStatusOrDefault(request.getStatus(), task.getStatus());
        task.setStatus(status);
        task.setPriority(parsePriorityOrDefault(request.getPriority(), task.getPriority()));
        task.setDeadline(request.getDeadline());
        task.setReminderOffsetMinutes(resolveReminderOffsetMinutes(request.getReminderOffsetMinutes()));
        if (task.getParent() != null) {
            task.setProgressPercentage(progressFromSubtaskStatus(status));
        } else if (!hasSubtasks) {
            task.setProgressPercentage(resolveProgress(
                    request.getProgressPercentage(),
                    status,
                    task.getProgressPercentage()));
        }

        Task savedTask = taskRepository.save(task);
        syncSubtasksAssignmentIfParent(savedTask);
        if (previousStatus != status) {
            recordStatusHistory(savedTask);
            if (status == TaskStatus.IN_REVIEW) {
                notificationWorkflowService.notifyTaskReviewRequested(savedTask);
            }
        }

        Long currentAssigneeId = savedTask.getAssignee() != null ? savedTask.getAssignee().getId() : null;
        if (currentAssigneeId != null && !currentAssigneeId.equals(previousAssigneeId)) {
            notificationWorkflowService.notifyTaskAssigned(savedTask);
        } else if (currentAssigneeId != null
                && (!savedTask.getDeadline().equals(previousDeadline) || !savedTask.getTitle().equals(previousTitle))) {
            notificationWorkflowService.notifyTaskUpdated(savedTask);
        }
        recalculateParentProgressIfSubtask(savedTask);
        return mapToTaskResponse(savedTask);
    }

    @Transactional
    public void deleteTask(Long taskId) {
        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        assertEventAcceptsChanges(task.getEvent());

        if (task.getParent() == null && taskRepository.existsByParentId(taskId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể xóa task lớn khi vẫn còn subtask");
        }

        Task parentTask = task.getParent();
        taskRepository.delete(task);
        if (parentTask != null) {
            recalculateParentProgress(parentTask);
        }
    }

    @Transactional
    public Task updateStatus(Long taskId, TaskStatus status) {
        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        assertEventAcceptsChanges(task.getEvent());
        assertManualProgressAllowed(task);
        TaskStatus previousStatus = task.getStatus();
        task.setStatus(status);
        if (task.getParent() != null) {
            task.setProgressPercentage(progressFromSubtaskStatus(status));
        } else if (status == TaskStatus.DONE) {
            task.setProgressPercentage(100);
        }
        Task savedTask = taskRepository.save(task);
        if (previousStatus != status) {
            recordStatusHistory(savedTask);
            if (status == TaskStatus.IN_REVIEW) {
                notificationWorkflowService.notifyTaskReviewRequested(savedTask);
            }
        }
        recalculateParentProgressIfSubtask(savedTask);
        return savedTask;
    }

    @Transactional
    public TaskResponseDTO updatePriority(Long taskId, TaskPriority priority) {
        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        assertEventAcceptsChanges(task.getEvent());

        task.setPriority(priority);
        Task savedTask = taskRepository.save(task);
        return mapToTaskResponse(savedTask);
    }

    @Transactional
    public TaskResponseDTO updateWork(Long taskId, TaskWorkUpdateRequest request) {
        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        assertEventAcceptsChanges(task.getEvent());
        assertManualProgressAllowed(task);

        User updater = task.getAssignee();
        TaskStatus previousStatus = task.getStatus();
        TaskStatus status = parseStatus(request.getStatus());
        task.setStatus(status);
        task.setProgressPercentage(task.getParent() != null
                ? progressFromSubtaskStatus(status)
                : resolveProgress(
                        request.getProgressPercentage(),
                        status,
                        task.getProgressPercentage()));

        Task savedTask = taskRepository.save(task);
        if (previousStatus != status) {
            recordStatusHistory(savedTask);
            if (status == TaskStatus.IN_REVIEW) {
                notificationWorkflowService.notifyTaskReviewRequested(savedTask);
            }
        }
        notificationWorkflowService.notifyTaskProgressUpdated(savedTask, updater);
        recalculateParentProgressIfSubtask(savedTask);

        return mapToTaskResponse(savedTask);
    }

    @Transactional
    public TaskResponseDTO updateAssignment(Long taskId, TaskAssignmentRequest request) {
        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        assertEventAcceptsChanges(task.getEvent());

        Long previousAssigneeId = task.getAssignee() != null ? task.getAssignee().getId() : null;
        Long eventId = task.getEvent().getId();
        Department department = task.getParent() != null
                ? task.getParent().getDepartment()
                : resolveDepartment(eventId, request.getDepartmentId());
        task.setDepartment(department);
        task.setAssignee(resolveAssignee(eventId, request.getAssigneeId(), department));

        Task savedTask = taskRepository.save(task);
        syncSubtasksAssignmentIfParent(savedTask);
        Long currentAssigneeId = savedTask.getAssignee() != null ? savedTask.getAssignee().getId() : null;
        if (currentAssigneeId != null && !currentAssigneeId.equals(previousAssigneeId)) {
            notificationWorkflowService.notifyTaskAssigned(savedTask);
        }
        return mapToTaskResponse(savedTask);
    }

    @Transactional(readOnly = true)
    public List<TaskReviewResponseDTO> getTaskReviews(Long taskId) {
        if (!taskRepository.existsById(taskId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task");
        }

        return taskReviewRepository.findAllByTaskIdWithReviewer(taskId).stream()
                .map(this::mapReviewToResponse)
                .toList();
    }

    @Transactional
    public TaskResponseDTO reviewTask(Long taskId, Long reviewerId, TaskReviewRequest request) {
        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        assertEventAcceptsChanges(task.getEvent());
        assertManualProgressAllowed(task);

        if (task.getStatus() != TaskStatus.IN_REVIEW) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ review được task đang IN_REVIEW");
        }

        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người review"));

        TaskStatus previousStatus = task.getStatus();
        TaskStatus nextStatus = parseStatus(request.getStatus());
        String feedback = validateFeedback(request.getFeedback());

        task.setStatus(nextStatus);
        if (task.getParent() != null) {
            task.setProgressPercentage(progressFromSubtaskStatus(nextStatus));
        } else if (nextStatus == TaskStatus.DONE) {
            task.setProgressPercentage(100);
        } else if (previousStatus == TaskStatus.DONE && task.getProgressPercentage() != null && task.getProgressPercentage() >= 100) {
            task.setProgressPercentage(99);
        }

        taskReviewRepository.save(TaskReview.builder()
                .task(task)
                .reviewer(reviewer)
                .statusBefore(previousStatus)
                .statusAfter(nextStatus)
                .feedback(feedback)
                .build());

        Task savedTask = taskRepository.save(task);
        if (previousStatus != nextStatus) {
            recordStatusHistory(savedTask);
        }
        notificationWorkflowService.notifyTaskReviewed(savedTask);
        recalculateParentProgressIfSubtask(savedTask);

        return mapToTaskResponse(savedTask);
    }

    public TaskStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái task không được để trống");
        }

        return parseStatusOrDefault(status, null);
    }

    public TaskPriority parsePriority(String priority) {
        if (priority == null || priority.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Độ ưu tiên task không được để trống");
        }

        return parsePriorityOrDefault(priority, null);
    }

    @Transactional(readOnly = true)
    public void ensureManualProgressAllowed(Long taskId) {
        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        assertManualProgressAllowed(task);
    }

    @Transactional
    public void syncParentProgressFromSubtask(Long taskId) {
        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        recalculateParentProgressIfSubtask(task);
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

    private Milestone resolveMilestone(Long eventId, Long milestoneId) {
        if (milestoneId == null) {
            return null;
        }

        return milestoneRepository.findByIdAndEventId(milestoneId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "milestoneId không thuộc sự kiện"));
    }

    private void validateTaskDeadlineWithinEvent(LocalDateTime deadline, Event event) {
        if (deadline == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Deadline không được để trống");
        }

        LocalDateTime eventEndTime = event.getEndTime() != null ? event.getEndTime() : event.getEventDate();
        if (eventEndTime != null && deadline.isAfter(eventEndTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Deadline task chỉ được nằm trước hoặc trong thời gian diễn ra sự kiện");
        }
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
            case "priority" -> "priority";
            case "department" -> "department.name";
            case "assignee" -> "assignee.name";
            default -> "deadline";
        };
    }

    private TaskResponseDTO mapToTaskResponse(Task task) {
        return TaskResponseDTO.builder()
                .id(task.getId())
                .eventId(task.getEvent().getId())
                .parentId(task.getParent() != null ? task.getParent().getId() : null)
                .departmentId(task.getDepartment() != null ? task.getDepartment().getId() : null)
                .departmentName(task.getDepartment() != null ? task.getDepartment().getName() : "Chưa gán ban")
                .milestoneId(task.getMilestone() != null ? task.getMilestone().getId() : null)
                .milestoneName(task.getMilestone() != null ? task.getMilestone().getName() : "Chưa gán milestone")
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .deadline(task.getDeadline())
                .reminderOffsetMinutes(resolveReminderOffsetMinutes(task.getReminderOffsetMinutes()))
                .deadlineStatus(resolveDeadlineStatus(task))
                .minutesUntilDeadline(resolveMinutesUntilDeadline(task.getDeadline()))
                .progressPercentage(task.getProgressPercentage() != null ? task.getProgressPercentage() : 0)
                .assigneeId(task.getAssignee() != null ? task.getAssignee().getId() : null)
                .assigneeName(task.getAssignee() != null ? task.getAssignee().getName() : "Chưa phân công")
                .build();
    }

    private Integer resolveReminderOffsetMinutes(Integer requestedOffsetMinutes) {
        return requestedOffsetMinutes != null ? requestedOffsetMinutes : 1440;
    }

    private String normalizeDeadlineStatus(String deadlineStatus) {
        if (deadlineStatus == null || deadlineStatus.isBlank()) {
            return null;
        }

        String normalized = deadlineStatus.trim().toUpperCase();
        if (!List.of("ACTIVE", "OVERDUE").contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái deadline không hợp lệ");
        }
        return normalized;
    }

    private String resolveDeadlineStatus(Task task) {
        if (task.getStatus() == TaskStatus.DONE) {
            return "COMPLETED";
        }

        LocalDateTime deadline = task.getDeadline();
        if (deadline == null) {
            return "NO_DEADLINE";
        }

        LocalDateTime now = LocalDateTime.now();
        if (deadline.isBefore(now)) {
            return "OVERDUE";
        }

        if (!deadline.isAfter(now.plusMinutes(resolveReminderOffsetMinutes(task.getReminderOffsetMinutes())))) {
            return "DUE_SOON";
        }

        return "ON_TRACK";
    }

    private Long resolveMinutesUntilDeadline(LocalDateTime deadline) {
        return deadline != null ? java.time.Duration.between(LocalDateTime.now(), deadline).toMinutes() : null;
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

    private void assertManualProgressAllowed(Task task) {
        if (task.getParent() == null && taskRepository.existsByParentId(task.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task đã có subtask nên tiến độ được tính tự động từ subtask");
        }
    }

    private void assertEventAcceptsChanges(Event event) {
        String status = event.getStatus();
        if ("CANCELLED".equalsIgnoreCase(status) || "CANCELED".equalsIgnoreCase(status) || "DONE".equalsIgnoreCase(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sự kiện đã đóng nên không thể thay đổi công việc");
        }
    }

    private void recalculateParentProgressIfSubtask(Task task) {
        if (task.getParent() != null) {
            recalculateParentProgress(task.getParent());
        }
    }

    private void recalculateParentProgress(Task parentTask) {
        List<Task> subtasks = taskRepository.findAllByParentIdWithDetails(parentTask.getId());
        if (subtasks.isEmpty()) {
            return;
        }

        TaskStatus previousStatus = parentTask.getStatus();
        int progress = Math.round((float) subtasks.stream()
                .mapToInt(subtask -> progressFromSubtaskStatus(subtask.getStatus()))
                .average()
                .orElse(0));

        parentTask.setProgressPercentage(progress);
        parentTask.setStatus(resolveParentStatus(subtasks, progress));
        Task savedParent = taskRepository.save(parentTask);
        if (previousStatus != savedParent.getStatus()) {
            recordStatusHistory(savedParent);
        }
    }

    private void syncSubtasksAssignmentIfParent(Task parentTask) {
        if (parentTask.getParent() != null || !taskRepository.existsByParentId(parentTask.getId())) {
            return;
        }

        List<Task> subtasks = taskRepository.findAllByParentIdWithDetails(parentTask.getId());
        subtasks.forEach(subtask -> {
            subtask.setDepartment(parentTask.getDepartment());
            if (!isAssigneeInDepartment(parentTask.getEvent().getId(), subtask.getAssignee(), parentTask.getDepartment())) {
                subtask.setAssignee(null);
            }
        });
        taskRepository.saveAll(subtasks);
    }

    private boolean isAssigneeInDepartment(Long eventId, User assignee, Department department) {
        if (assignee == null) {
            return true;
        }

        if (department == null) {
            return false;
        }

        return eventMemberRepository.existsByEventIdAndUserIdAndDepartmentId(
                eventId,
                assignee.getId(),
                department.getId());
    }

    private TaskStatus resolveParentStatus(List<Task> subtasks, int progress) {
        boolean allDone = subtasks.stream().allMatch(subtask -> subtask.getStatus() == TaskStatus.DONE);
        if (allDone) {
            return TaskStatus.DONE;
        }
        boolean hasInReview = subtasks.stream().anyMatch(subtask -> subtask.getStatus() == TaskStatus.IN_REVIEW);
        if (hasInReview) {
            return TaskStatus.IN_REVIEW;
        }
        boolean hasStarted = progress > 0 || subtasks.stream().anyMatch(subtask -> subtask.getStatus() == TaskStatus.IN_PROGRESS);
        return hasStarted ? TaskStatus.IN_PROGRESS : TaskStatus.TODO;
    }

    private int progressFromSubtaskStatus(TaskStatus status) {
        return status == TaskStatus.DONE ? 100 : 0;
    }

    private TaskPriority parseOptionalPriority(String priority) {
        if (priority == null || priority.isBlank()) {
            return null;
        }
        return parsePriorityOrDefault(priority, null);
    }

    private TaskPriority parsePriorityOrDefault(String priority, TaskPriority defaultPriority) {
        if (priority == null || priority.isBlank()) {
            return defaultPriority != null ? defaultPriority : TaskPriority.MEDIUM;
        }

        try {
            return TaskPriority.valueOf(priority.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Độ ưu tiên task không hợp lệ", e);
        }
    }

    private String validateFeedback(String feedback) {
        if (feedback == null || feedback.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Feedback không được để trống");
        }

        String normalized = feedback.trim();
        if (normalized.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Feedback không được vượt quá 2000 ký tự");
        }
        return normalized;
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = value.trim();
        if (normalized.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mô tả task không được vượt quá 2000 ký tự");
        }
        return normalized;
    }

    private TaskReviewResponseDTO mapReviewToResponse(TaskReview review) {
        return TaskReviewResponseDTO.builder()
                .id(review.getId())
                .taskId(review.getTask().getId())
                .reviewerId(review.getReviewer().getId())
                .reviewerName(review.getReviewer().getName())
                .statusBefore(review.getStatusBefore())
                .statusAfter(review.getStatusAfter())
                .feedback(review.getFeedback())
                .reviewedAt(review.getReviewedAt())
                .build();
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


