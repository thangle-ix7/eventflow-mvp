package com.eventflow.backend.service;

import com.eventflow.backend.dto.AiCalendarSuggestionResponse;
import com.eventflow.backend.dto.AiDepartmentSuggestionResponse;
import com.eventflow.backend.dto.AiPlanningSuggestionResponse;
import com.eventflow.backend.dto.AiSubtaskSuggestionResponse;
import com.eventflow.backend.dto.AiSuggestionRequest;
import com.eventflow.backend.dto.AiTaskSuggestionResponse;
import com.eventflow.backend.dto.DepartmentRequestDTO;
import com.eventflow.backend.dto.EventCalendarItemRequest;
import com.eventflow.backend.dto.PlanningPhaseRequestDTO;
import com.eventflow.backend.dto.PlanningRequestDTO;
import com.eventflow.backend.dto.TaskRequestDTO;
import com.eventflow.backend.entity.Department;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.Planning;
import com.eventflow.backend.entity.PlanningPhase;
import com.eventflow.backend.entity.Task;
import com.eventflow.backend.entity.TaskPriority;
import com.eventflow.backend.repository.DepartmentRepository;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.PlanningPhaseRepository;
import com.eventflow.backend.repository.PlanningRepository;
import com.eventflow.backend.repository.TaskRepository;
import com.eventflow.backend.security.EventSecurityService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

@Service
@RequiredArgsConstructor
public class AiSuggestionService {

    private final EventRepository eventRepository;
    private final DepartmentRepository departmentRepository;
    private final TaskRepository taskRepository;
    private final PlanningRepository planningRepository;
    private final PlanningPhaseRepository planningPhaseRepository;
    private final EventSecurityService eventSecurityService;
    private final OpenAiEventflowAssistantClient openAiAssistantClient;
    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public AiDepartmentSuggestionResponse suggestDepartments(Long eventId, Long userId, AiSuggestionRequest request) {
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ leader của sự kiện mới được gợi ý phòng ban");
        }

        Event event = getEvent(eventId);
        List<Department> departments = departmentRepository.findAllByEventIdOrderByNameAsc(eventId);
        int count = resolveCount(request, 5);

        Optional<JsonNode> aiJson = openAiAssistantClient.generateJson(
                departmentInstructions(count),
                baseInput(event, departments, null, request));

        return AiDepartmentSuggestionResponse.builder()
                .departments(aiJson
                        .map(json -> parseDepartments(json, departments, count))
                        .filter(items -> !items.isEmpty())
                        .orElseGet(() -> fallbackDepartments(departments, count)))
                .build();
    }

    @Transactional(readOnly = true)
    public AiTaskSuggestionResponse suggestTasks(Long eventId, Long userId, AiSuggestionRequest request) {
        if (!canSuggestWorkForEvent(eventId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ leader của sự kiện hoặc trưởng ban mới được gợi ý task");
        }

        Event event = getEvent(eventId);
        List<Department> departments = departmentRepository.findAllByEventIdOrderByNameAsc(eventId);
        List<Task> existingTasks = taskRepository.findAllByEventIdWithDetails(eventId);
        int count = resolveCount(request, 8);

        Optional<JsonNode> aiJson = openAiAssistantClient.generateJson(
                taskInstructions(count),
                baseInput(event, departments, existingTasks, request));

        return AiTaskSuggestionResponse.builder()
                .tasks(aiJson
                        .map(json -> parseTasks(json.path("tasks"), event, departments, count))
                        .filter(items -> !items.isEmpty())
                        .orElseGet(() -> fallbackTasks(event, departments, count)))
                .build();
    }

    @Transactional(readOnly = true)
    public AiPlanningSuggestionResponse suggestPlanning(Long eventId, Long userId, AiSuggestionRequest request) {
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ leader của sự kiện mới được gợi ý kế hoạch");
        }

        Event event = getEvent(eventId);
        List<Department> departments = departmentRepository.findAllByEventIdOrderByNameAsc(eventId);
        List<Task> existingTasks = taskRepository.findAllByEventIdWithDetails(eventId);
        int phaseCount = resolveCount(request, 4);
        Map<String, Object> input = baseInput(event, departments, existingTasks, request);
        input.put("existingPlannings", loadPlanningInputs(eventId));

        Optional<JsonNode> aiJson = openAiAssistantClient.generateJson(
                planningInstructions(phaseCount),
                input);

        return AiPlanningSuggestionResponse.builder()
                .planning(aiJson
                        .map(json -> parsePlanning(json.path("planning"), phaseCount))
                        .filter(planning -> planning.getTitle() != null && !planning.getTitle().isBlank())
                        .orElseGet(() -> fallbackPlanning(event, phaseCount)))
                .build();
    }

    @Transactional(readOnly = true)
    public AiCalendarSuggestionResponse suggestCalendarItems(Long eventId, Long userId, AiSuggestionRequest request) {
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ leader của sự kiện mới được gợi ý lịch");
        }

        Event event = getEvent(eventId);
        List<Department> departments = departmentRepository.findAllByEventIdOrderByNameAsc(eventId);
        List<Task> existingTasks = taskRepository.findAllByEventIdWithDetails(eventId);
        int count = resolveCount(request, 5);
        Map<String, Object> input = baseInput(event, departments, existingTasks, request);
        input.put("existingCalendarItems", loadCalendarItems(eventId));

        Optional<JsonNode> aiJson = openAiAssistantClient.generateJson(
                calendarInstructions(count),
                input);

        return AiCalendarSuggestionResponse.builder()
                .calendarItems(aiJson
                        .map(json -> parseCalendarItems(json.path("calendarItems"), event, departments, count))
                        .filter(items -> !items.isEmpty())
                        .orElseGet(() -> fallbackCalendarItems(event, departments, count)))
                .build();
    }

    @Transactional(readOnly = true)
    public AiSubtaskSuggestionResponse suggestSubtasks(Long taskId, Long userId, AiSuggestionRequest request) {
        Task parentTask = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        Long eventId = parentTask.getEvent().getId();
        if (!canSuggestWorkForTask(parentTask, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ leader của sự kiện hoặc trưởng ban mới được gợi ý subtask");
        }

        List<Department> departments = departmentRepository.findAllByEventIdOrderByNameAsc(eventId);
        int count = resolveCount(request, 5);
        Map<String, Object> input = baseInput(parentTask.getEvent(), departments, List.of(parentTask), request);
        input.put("parentTask", taskInput(parentTask));

        Optional<JsonNode> aiJson = openAiAssistantClient.generateJson(subtaskInstructions(count), input);

        return AiSubtaskSuggestionResponse.builder()
                .subtasks(aiJson
                        .map(json -> parseTasks(json.path("subtasks"), parentTask.getDeadline(), departments, count))
                        .filter(items -> !items.isEmpty())
                        .orElseGet(() -> fallbackSubtasks(parentTask, count)))
                .build();
    }

    private Event getEvent(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));
    }

    private boolean canSuggestWorkForEvent(Long eventId, Long userId) {
        return eventSecurityService.isLeaderOfEvent(eventId, userId) || isDepartmentLeaderOfEvent(eventId, userId);
    }

    private boolean canSuggestWorkForTask(Task task, Long userId) {
        return eventSecurityService.isLeaderOfEvent(task.getEvent().getId(), userId)
                || isLeaderOfDepartment(task.getDepartment(), userId);
    }

    private boolean isDepartmentLeaderOfEvent(Long eventId, Long userId) {
        return departmentRepository.findAllByEventIdOrderByNameAsc(eventId).stream()
                .anyMatch(department -> isLeaderOfDepartment(department, userId));
    }

    private boolean isLeaderOfDepartment(Department department, Long userId) {
        return department != null
                && department.getLeader() != null
                && department.getLeader().getId().equals(userId);
    }

    private Map<String, Object> baseInput(Event event, List<Department> departments, List<Task> tasks, AiSuggestionRequest request) {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("event", eventInput(event));
        input.put("existingDepartments", departments.stream().map(this::departmentInput).toList());
        input.put("existingTasks", tasks == null ? List.of() : tasks.stream().map(this::taskInput).toList());
        input.put("userInstruction", request != null ? request.getInstruction() : null);
        input.put("requestedCount", request != null ? request.getCount() : null);
        return input;
    }

    private Map<String, Object> eventInput(Event event) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", event.getId());
        data.put("name", event.getName());
        data.put("description", event.getDescription());
        data.put("location", event.getLocation());
        data.put("startTime", event.getEventDate());
        data.put("endTime", event.getEndTime());
        data.put("status", event.getStatus());
        data.put("contextDescription", event.getContextDescription());
        data.put("objective", event.getObjective());
        data.put("expectedAttendees", event.getExpectedAttendees());
        data.put("scale", event.getScale());
        return data;
    }

    private Map<String, Object> departmentInput(Department department) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", department.getId());
        data.put("name", department.getName());
        data.put("description", department.getDescription());
        data.put("leaderUserId", department.getLeader() != null ? department.getLeader().getId() : null);
        return data;
    }

    private Map<String, Object> taskInput(Task task) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", task.getId());
        data.put("title", task.getTitle());
        data.put("description", task.getDescription());
        data.put("departmentId", task.getDepartment() != null ? task.getDepartment().getId() : null);
        data.put("departmentName", task.getDepartment() != null ? task.getDepartment().getName() : null);
        data.put("assigneeId", task.getAssignee() != null ? task.getAssignee().getId() : null);
        data.put("status", task.getStatus());
        data.put("priority", task.getPriority());
        data.put("deadline", task.getDeadline());
        return data;
    }

    private Map<String, Object> planningInput(Planning planning) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", planning.getId());
        data.put("title", planning.getTitle());
        data.put("description", planning.getDescription());
        data.put("phases", planningPhaseRepository.findAllByPlanningIdOrderByOrderIndexAscIdAsc(planning.getId()).stream()
                .map(this::planningPhaseInput)
                .toList());
        return data;
    }

    private Map<String, Object> planningPhaseInput(PlanningPhase phase) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", phase.getId());
        data.put("phaseName", phase.getPhaseName());
        data.put("description", phase.getDescription());
        data.put("objective", phase.getObjective());
        data.put("orderIndex", phase.getOrderIndex());
        return data;
    }

    private String departmentInstructions(int count) {
        return """
                Bạn là AI gợi ý dữ liệu cho EventFlow. Chỉ trả JSON object, không markdown.
                Dựa trên thông tin event và các department hiện có, gợi ý tối đa %d department mới.
                Không tạo planning, milestone hoặc trường ngoài database hiện tại.
                Đây là gợi ý để user chọn lưu hàng loạt, nên cần đa dạng, khách quan, bao phủ các mảng vận hành khác nhau.
                JSON phải có dạng:
                {"departments":[{"name":"...", "description":"...", "leaderUserId":null}]}
                name tối đa 100 ký tự, description tối đa 1000 ký tự.
                Tuyệt đối không đề xuất department trùng hoặc gần trùng tên với existingDepartments.
                """.formatted(count);
    }

    private String taskInstructions(int count) {
        return """
                Bạn là AI gợi ý dữ liệu cho EventFlow. Chỉ trả JSON object, không markdown.
                Dựa trên event và department hiện có, gợi ý tối đa %d task có thể lưu bằng API hiện tại.
                Không dùng planning, milestone, milestoneName, phaseName hoặc trường ngoài database hiện tại.
                Nếu chọn department thì departmentId phải lấy từ existingDepartments; nếu không chắc thì để null.
                assigneeId để null. status mặc định TODO. progressPercentage mặc định 0.
                deadline là ISO local datetime và không sau event.endTime.
                JSON phải có dạng:
                {"tasks":[{"title":"...", "description":"...", "departmentId":1, "assigneeId":null, "status":"TODO", "priority":"HIGH", "deadline":"2026-07-09T17:00:00", "progressPercentage":0}]}
                priority chỉ được là LOW, MEDIUM, HIGH hoặc URGENT.
                """.formatted(count);
    }

    private String planningInstructions(int phaseCount) {
        return """
                Bạn là AI gợi ý dữ liệu cho EventFlow. Chỉ trả JSON object, không markdown.
                Dựa trên thông tin event, department hiện có, task hiện có và planning hiện có, hãy gợi ý 1 planning tổng thể.
                Planning là kế hoạch vận hành/giai đoạn triển khai, không phải milestone.
                Không tạo milestone, không tạo task, không gán assignee, không dùng trường ngoài API Planning CRUD hiện tại.
                Gợi ý tối đa %d phase. Nếu event đã có planning, tránh trùng nội dung với existingPlannings.
                JSON phải có dạng:
                {"planning":{"title":"...", "description":"...", "phases":[{"phaseName":"...", "description":"...", "objective":"...", "orderIndex":0}]}}
                title và phaseName tối đa 255 ký tự. description và objective tối đa 2000 ký tự.
                orderIndex bắt đầu từ 0, tăng dần theo thứ tự thực hiện.
                """.formatted(phaseCount);
    }

    private String subtaskInstructions(int count) {
        return """
                Bạn là AI gợi ý dữ liệu cho EventFlow. Chỉ trả JSON object, không markdown.
                Dựa trên parentTask, chia thành tối đa %d subtask có thể lưu bằng API tạo subtask hiện tại.
                Không dùng planning, milestone hoặc trường ngoài database hiện tại.
                departmentId và assigneeId để null vì backend sẽ kế thừa từ task cha.
                status mặc định TODO, progressPercentage mặc định 0, priority kế thừa hoặc phù hợp với task cha.
                deadline là ISO local datetime và không sau parentTask.deadline.
                JSON phải có dạng:
                {"subtasks":[{"title":"...", "description":"...", "departmentId":null, "assigneeId":null, "status":"TODO", "priority":"MEDIUM", "deadline":"2026-07-09T17:00:00", "progressPercentage":0}]}
                """.formatted(count);
    }

    private String calendarInstructions(int count) {
        return """
                Bạn là AI gợi ý dữ liệu cho EventFlow. Chỉ trả JSON object, không markdown.
                Dựa trên event, department và task hiện có, gợi ý tối đa %d lịch có thể lưu bằng API calendar hiện tại.
                Không dùng planning, milestone hoặc trường ngoài database hiện tại.
                Đây là gợi ý để user chọn lưu hàng loạt, nên cần trải đều các mốc họp, setup, rehearsal, check-in nếu phù hợp.
                Không đề xuất lịch trùng hoặc gần trùng title + thời gian với existingCalendarItems.
                Nếu chọn department thì departmentId phải lấy từ existingDepartments; nếu không chắc thì để null.
                attendeeIds để [] trừ khi userInstruction chỉ rõ thành viên cụ thể.
                startTime/endTime là ISO local datetime, nằm trong khoảng event.startTime đến event.endTime, endTime phải sau startTime.
                JSON phải có dạng:
                {"calendarItems":[{"title":"...", "description":"...", "location":"...", "type":"MEETING", "departmentId":1, "startTime":"2026-07-09T09:00:00", "endTime":"2026-07-09T10:00:00", "allDay":false, "status":"SCHEDULED", "meetingUrl":"", "attendeeIds":[]}]}
                type chỉ dùng MEETING, REHEARSAL, SETUP, CHECKIN hoặc OTHER. status mặc định SCHEDULED.
                """.formatted(count);
    }

    private List<DepartmentRequestDTO> parseDepartments(JsonNode json, List<Department> existingDepartments, int count) {
        JsonNode departments = json.path("departments");
        if (!departments.isArray()) {
            return List.of();
        }

        Set<String> usedNames = existingDepartmentNames(existingDepartments);
        return streamJson(departments)
                .map(item -> new DepartmentRequestDTO(
                        limitText(item.path("name").asText(""), 100),
                        limitText(item.path("description").asText(null), 1000),
                        item.path("leaderUserId").isNumber() ? item.path("leaderUserId").asLong() : null))
                .filter(item -> item.getName() != null && !item.getName().isBlank())
                .filter(item -> usedNames.add(normalizeName(item.getName())))
                .limit(count)
                .toList();
    }

    private PlanningRequestDTO parsePlanning(JsonNode planning, int phaseCount) {
        if (!planning.isObject()) {
            return null;
        }

        PlanningRequestDTO request = new PlanningRequestDTO();
        request.setTitle(limitText(planning.path("title").asText(""), 255));
        request.setDescription(limitText(planning.path("description").asText(null), 2000));
        request.setPhases(parsePlanningPhases(planning.path("phases"), phaseCount));
        return request;
    }

    private List<PlanningPhaseRequestDTO> parsePlanningPhases(JsonNode phases, int phaseCount) {
        if (!phases.isArray()) {
            return List.of();
        }

        return streamJson(phases)
                .limit(phaseCount)
                .map(item -> new PlanningPhaseRequestDTO(
                        limitText(item.path("phaseName").asText(""), 255),
                        limitText(item.path("description").asText(null), 2000),
                        limitText(item.path("objective").asText(null), 2000),
                        resolveOrderIndex(item.path("orderIndex"))))
                .filter(item -> item.getPhaseName() != null && !item.getPhaseName().isBlank())
                .toList();
    }

    private List<TaskRequestDTO> parseTasks(JsonNode items, Event event, List<Department> departments, int count) {
        return parseTasks(items, eventEndTime(event), departments, count);
    }

    private List<TaskRequestDTO> parseTasks(JsonNode items, LocalDateTime latestAllowed, List<Department> departments, int count) {
        if (!items.isArray()) {
            return List.of();
        }

        return streamJson(items)
                .limit(count)
                .map(item -> {
                    TaskRequestDTO task = new TaskRequestDTO();
                    task.setTitle(limitText(item.path("title").asText(""), 255));
                    task.setDescription(limitText(item.path("description").asText(null), 2000));
                    task.setDepartmentId(resolveDepartmentId(item.path("departmentId"), departments));
                    task.setAssigneeId(null);
                    task.setStatus("TODO");
                    task.setPriority(resolvePriority(item.path("priority").asText(null)));
                    task.setDeadline(resolveDeadline(item.path("deadline").asText(null), latestAllowed));
                    task.setProgressPercentage(0);
                    return task;
                })
                .filter(item -> item.getTitle() != null && !item.getTitle().isBlank())
                .toList();
    }

    private List<EventCalendarItemRequest> parseCalendarItems(JsonNode items, Event event, List<Department> departments, int count) {
        if (!items.isArray()) {
            return List.of();
        }

        LocalDateTime earliestAllowed = event.getEventDate();
        LocalDateTime latestAllowed = eventEndTime(event);
        return streamJson(items)
                .limit(count)
                .map(item -> calendarItem(
                        limitText(item.path("title").asText(""), 255),
                        limitText(item.path("description").asText(null), 2000),
                        limitText(item.path("location").asText(event.getLocation()), 255),
                        resolveCalendarType(item.path("type").asText(null)),
                        resolveDepartmentId(item.path("departmentId"), departments),
                        resolveCalendarStart(item.path("startTime").asText(null), earliestAllowed, latestAllowed),
                        resolveCalendarEnd(item.path("endTime").asText(null), item.path("startTime").asText(null), earliestAllowed, latestAllowed),
                        item.path("allDay").asBoolean(false),
                        resolveCalendarStatus(item.path("status").asText(null))))
                .filter(item -> item.getTitle() != null && !item.getTitle().isBlank())
                .toList();
    }

    private Long resolveDepartmentId(JsonNode departmentIdNode, List<Department> departments) {
        if (!departmentIdNode.isNumber()) {
            return null;
        }
        long departmentId = departmentIdNode.asLong();
        return departments.stream().anyMatch(department -> department.getId().equals(departmentId))
                ? departmentId
                : null;
    }

    private String resolvePriority(String priority) {
        if (priority == null || priority.isBlank()) {
            return TaskPriority.MEDIUM.name();
        }
        try {
            return TaskPriority.valueOf(priority.trim().toUpperCase()).name();
        } catch (IllegalArgumentException e) {
            return TaskPriority.MEDIUM.name();
        }
    }

    private Integer resolveOrderIndex(JsonNode orderIndexNode) {
        if (!orderIndexNode.isNumber()) {
            return 0;
        }
        return Math.max(orderIndexNode.asInt(), 0);
    }

    private LocalDateTime resolveDeadline(String value, LocalDateTime latestAllowed) {
        LocalDateTime fallback = latestAllowed != null ? latestAllowed : LocalDateTime.now().plusDays(1).withSecond(0).withNano(0);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            LocalDateTime parsed = LocalDateTime.parse(value.trim());
            return latestAllowed != null && parsed.isAfter(latestAllowed) ? latestAllowed : parsed;
        } catch (RuntimeException e) {
            return fallback;
        }
    }

    private LocalDateTime resolveCalendarStart(String value, LocalDateTime earliestAllowed, LocalDateTime latestAllowed) {
        LocalDateTime fallback = earliestAllowed != null ? earliestAllowed : LocalDateTime.now().plusDays(1).withHour(9).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime parsed = parseLocalDateTime(value, fallback);
        if (earliestAllowed != null && parsed.isBefore(earliestAllowed)) {
            return earliestAllowed;
        }
        if (latestAllowed != null && parsed.isAfter(latestAllowed)) {
            return latestAllowed;
        }
        return parsed;
    }

    private LocalDateTime resolveCalendarEnd(String endValue, String startValue, LocalDateTime earliestAllowed, LocalDateTime latestAllowed) {
        LocalDateTime start = resolveCalendarStart(startValue, earliestAllowed, latestAllowed);
        LocalDateTime fallback = start.plusHours(1);
        LocalDateTime parsed = parseLocalDateTime(endValue, fallback);
        if (!parsed.isAfter(start)) {
            parsed = fallback;
        }
        return latestAllowed != null && parsed.isAfter(latestAllowed) ? latestAllowed : parsed;
    }

    private LocalDateTime parseLocalDateTime(String value, LocalDateTime fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return LocalDateTime.parse(value.trim());
        } catch (RuntimeException e) {
            return fallback;
        }
    }

    private String resolveCalendarType(String value) {
        if (value == null || value.isBlank()) {
            return "MEETING";
        }
        String normalized = value.trim().toUpperCase();
        return switch (normalized) {
            case "MEETING", "REHEARSAL", "SETUP", "CHECKIN", "OTHER" -> normalized;
            default -> "OTHER";
        };
    }

    private String resolveCalendarStatus(String value) {
        return value == null || value.isBlank() ? "SCHEDULED" : limitText(value.toUpperCase(), 20);
    }

    private LocalDateTime eventEndTime(Event event) {
        return event.getEndTime() != null ? event.getEndTime() : event.getEventDate();
    }

    private int resolveCount(AiSuggestionRequest request, int defaultCount) {
        if (request == null || request.getCount() == null) {
            return defaultCount;
        }
        return Math.min(Math.max(request.getCount(), 1), 20);
    }

    private String limitText(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }

    private List<DepartmentRequestDTO> fallbackDepartments(List<Department> existingDepartments, int count) {
        Set<String> usedNames = existingDepartmentNames(existingDepartments);
        List<DepartmentRequestDTO> suggestions = List.of(
                new DepartmentRequestDTO("Ban Nội dung", "Phụ trách agenda, kịch bản chương trình và tài liệu nội dung.", null),
                new DepartmentRequestDTO("Ban Truyền thông", "Phụ trách bài đăng, hình ảnh, thông báo và kênh truyền thông sự kiện.", null),
                new DepartmentRequestDTO("Ban Hậu cần", "Phụ trách địa điểm, thiết bị, vật tư, check-in và điều phối vận hành.", null),
                new DepartmentRequestDTO("Ban Nhân sự", "Phụ trách tuyển, phân công và theo dõi nhân sự hỗ trợ sự kiện.", null),
                new DepartmentRequestDTO("Ban Tài chính", "Phụ trách dự toán chi phí, mua sắm và kiểm soát ngân sách.", null),
                new DepartmentRequestDTO("Ban Kỹ thuật", "Phụ trách âm thanh, ánh sáng, thiết bị trình chiếu và hỗ trợ kỹ thuật.", null),
                new DepartmentRequestDTO("Ban Đối ngoại", "Phụ trách khách mời, đối tác, nhà tài trợ và thư mời.", null));
        return suggestions.stream()
                .filter(item -> usedNames.add(normalizeName(item.getName())))
                .limit(count)
                .toList();
    }

    private List<TaskRequestDTO> fallbackTasks(Event event, List<Department> departments, int count) {
        Long firstDepartmentId = departments.isEmpty() ? null : departments.get(0).getId();
        LocalDateTime deadline = eventEndTime(event);
        List<TaskRequestDTO> suggestions = List.of(
                task("Xây dựng agenda chương trình", "Lên khung nội dung, thời lượng từng phần và người phụ trách.", firstDepartmentId, "HIGH", deadline),
                task("Chuẩn bị kịch bản vận hành", "Soạn kịch bản MC, timeline điều phối và checklist ngày sự kiện.", firstDepartmentId, "HIGH", deadline),
                task("Chuẩn bị truyền thông sự kiện", "Thiết kế nội dung giới thiệu, poster và lịch đăng bài.", null, "MEDIUM", deadline),
                task("Kiểm tra địa điểm và thiết bị", "Rà soát phòng, âm thanh, ánh sáng, bàn ghế và vật tư cần thiết.", null, "HIGH", deadline),
                task("Tổng hợp danh sách người tham gia", "Chuẩn bị form đăng ký, danh sách check-in và phương án hỗ trợ.", null, "MEDIUM", deadline));
        return suggestions.stream().limit(count).toList();
    }

    private PlanningRequestDTO fallbackPlanning(Event event, int phaseCount) {
        List<PlanningPhaseRequestDTO> phases = List.of(
                new PlanningPhaseRequestDTO(
                        "Giai đoạn khởi động",
                        "Làm rõ mục tiêu, phạm vi, nhân sự tham gia và cách phối hợp trong event.",
                        "Đảm bảo team hiểu cùng một mục tiêu và có kế hoạch vận hành ban đầu.",
                        0),
                new PlanningPhaseRequestDTO(
                        "Giai đoạn chuẩn bị",
                        "Chuẩn bị nội dung, nguồn lực, checklist công việc và các hạng mục cần thiết.",
                        "Hoàn tất các đầu việc nền tảng trước khi bước vào triển khai chính.",
                        1),
                new PlanningPhaseRequestDTO(
                        "Giai đoạn triển khai",
                        "Theo dõi tiến độ, điều phối các department và xử lý phát sinh trong quá trình thực hiện.",
                        "Đảm bảo event vận hành đúng tiến độ và các task quan trọng được kiểm soát.",
                        2),
                new PlanningPhaseRequestDTO(
                        "Giai đoạn tổng kết",
                        "Tổng hợp kết quả, ghi nhận vấn đề, đánh giá hiệu quả và rút kinh nghiệm.",
                        "Có dữ liệu tổng kết để cải thiện các event tiếp theo.",
                        3));

        return new PlanningRequestDTO(
                "Kế hoạch vận hành " + event.getName(),
                "Kế hoạch tổng thể giúp điều phối các giai đoạn chính của event từ khởi động đến tổng kết.",
                phases.stream().limit(phaseCount).toList());
    }

    private List<TaskRequestDTO> fallbackSubtasks(Task parentTask, int count) {
        LocalDateTime deadline = parentTask.getDeadline();
        List<TaskRequestDTO> suggestions = List.of(
                task("Xác định yêu cầu đầu ra", "Làm rõ kết quả cần đạt và tiêu chí hoàn thành cho task chính.", null, parentTask.getPriority().name(), deadline),
                task("Thu thập thông tin cần thiết", "Tổng hợp dữ liệu, tài liệu hoặc nguồn lực liên quan để thực hiện task.", null, parentTask.getPriority().name(), deadline),
                task("Thực hiện bản nháp", "Hoàn thành phiên bản đầu tiên để leader hoặc team góp ý.", null, parentTask.getPriority().name(), deadline),
                task("Rà soát và chỉnh sửa", "Cập nhật theo góp ý, kiểm tra lỗi và hoàn thiện nội dung.", null, parentTask.getPriority().name(), deadline),
                task("Bàn giao kết quả", "Gửi kết quả cuối cùng và ghi nhận các điểm cần theo dõi tiếp.", null, parentTask.getPriority().name(), deadline));
        return suggestions.stream().limit(count).toList();
    }

    private List<EventCalendarItemRequest> fallbackCalendarItems(Event event, List<Department> departments, int count) {
        Long firstDepartmentId = departments.isEmpty() ? null : departments.get(0).getId();
        LocalDateTime start = event.getEventDate() != null ? event.getEventDate() : LocalDateTime.now().plusDays(1).withHour(9).withMinute(0).withSecond(0).withNano(0);
        List<EventCalendarItemRequest> suggestions = List.of(
                calendarItem("Họp kickoff Ban tổ chức", "Chốt mục tiêu, phạm vi công việc, timeline và đầu mối từng ban.", event.getLocation(), "MEETING", null, start, start.plusHours(1), false, "SCHEDULED"),
                calendarItem("Rà soát checklist chuẩn bị", "Kiểm tra tiến độ các hạng mục nội dung, truyền thông, hậu cần và nhân sự.", event.getLocation(), "MEETING", firstDepartmentId, start.plusDays(1), start.plusDays(1).plusHours(1), false, "SCHEDULED"),
                calendarItem("Setup địa điểm", "Chuẩn bị không gian, thiết bị, bảng chỉ dẫn và khu vực check-in.", event.getLocation(), "SETUP", null, start.plusDays(2), start.plusDays(2).plusHours(2), false, "SCHEDULED"),
                calendarItem("Rehearsal chương trình", "Chạy thử agenda, âm thanh, ánh sáng, cue điều phối và kịch bản MC.", event.getLocation(), "REHEARSAL", null, start.plusDays(3), start.plusDays(3).plusHours(2), false, "SCHEDULED"),
                calendarItem("Check-in người tham dự", "Mở bàn check-in, xác nhận danh sách và hỗ trợ khách mời.", event.getLocation(), "CHECKIN", null, start, start.plusHours(1), false, "SCHEDULED"));
        return suggestions.stream().limit(count).toList();
    }

    private TaskRequestDTO task(String title, String description, Long departmentId, String priority, LocalDateTime deadline) {
        TaskRequestDTO task = new TaskRequestDTO();
        task.setTitle(title);
        task.setDescription(description);
        task.setDepartmentId(departmentId);
        task.setAssigneeId(null);
        task.setStatus("TODO");
        task.setPriority(priority);
        task.setDeadline(deadline != null ? deadline : LocalDateTime.now().plusDays(1).withSecond(0).withNano(0));
        task.setProgressPercentage(0);
        return task;
    }

    private EventCalendarItemRequest calendarItem(String title, String description, String location, String type, Long departmentId,
                                                  LocalDateTime startTime, LocalDateTime endTime, boolean allDay, String status) {
        EventCalendarItemRequest item = new EventCalendarItemRequest();
        item.setTitle(title);
        item.setDescription(description);
        item.setLocation(location);
        item.setType(type);
        item.setDepartmentId(departmentId);
        item.setStartTime(startTime);
        item.setEndTime(endTime != null && endTime.isAfter(startTime) ? endTime : startTime.plusHours(1));
        item.setAllDay(allDay);
        item.setStatus(status);
        item.setMeetingUrl("");
        item.setAttendeeIds(List.of());
        return item;
    }

    private List<Map<String, Object>> loadCalendarItems(Long eventId) {
        return jdbcTemplate.queryForList("""
                SELECT title, type, department_id, start_time, end_time, location
                FROM calendar_event
                WHERE event_id = ? AND deleted_at IS NULL
                ORDER BY start_time ASC
                LIMIT 100
                """, eventId);
    }

    private List<Map<String, Object>> loadPlanningInputs(Long eventId) {
        return planningRepository.findAllByEventIdOrderByCreatedAtAsc(eventId).stream()
                .map(this::planningInput)
                .toList();
    }

    private Set<String> existingDepartmentNames(List<Department> departments) {
        Set<String> names = new HashSet<>();
        departments.forEach(department -> names.add(normalizeName(department.getName())));
        return names;
    }

    private String normalizeName(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private Stream<JsonNode> streamJson(JsonNode array) {
        return StreamSupport.stream(array.spliterator(), false);
    }
}
