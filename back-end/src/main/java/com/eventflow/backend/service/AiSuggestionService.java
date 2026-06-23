package com.eventflow.backend.service;

import com.eventflow.backend.dto.AiCalendarSuggestionResponse;
import com.eventflow.backend.dto.AiDepartmentSuggestionResponse;
import com.eventflow.backend.dto.AiMilestoneSuggestionResponse;
import com.eventflow.backend.dto.AiSubtaskSuggestionResponse;
import com.eventflow.backend.dto.AiSuggestionRequest;
import com.eventflow.backend.dto.AiTaskSuggestionResponse;
import com.eventflow.backend.dto.DepartmentRequestDTO;
import com.eventflow.backend.dto.EventCalendarItemRequest;
import com.eventflow.backend.dto.MilestoneRequestDTO;
import com.eventflow.backend.dto.TaskRequestDTO;
import com.eventflow.backend.entity.Department;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.Task;
import com.eventflow.backend.entity.TaskPriority;
import com.eventflow.backend.repository.DepartmentRepository;
import com.eventflow.backend.repository.EventRepository;
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
    private final EventSecurityService eventSecurityService;
    private final OpenAiEventflowAssistantClient openAiAssistantClient;
    private final JdbcTemplate jdbcTemplate;
    private final SubscriptionService subscriptionService;

    @Transactional
    public AiDepartmentSuggestionResponse suggestDepartments(Long eventId, Long userId, AiSuggestionRequest request) {
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ leader của sự kiện mới được gợi ý phòng ban");
        }
        subscriptionService.consumeAiCredit(userId, eventId, "SUGGEST_DEPARTMENTS");

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

    @Transactional
    public AiTaskSuggestionResponse suggestTasks(Long eventId, Long userId, AiSuggestionRequest request) {
        if (!canSuggestWorkForEvent(eventId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ leader của sự kiện hoặc trưởng ban mới được gợi ý task");
        }
        subscriptionService.consumeAiCredit(userId, eventId, "SUGGEST_TASKS");

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

    @Transactional
    public AiMilestoneSuggestionResponse suggestMilestones(Long eventId, Long userId, AiSuggestionRequest request) {
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ leader của sự kiện mới được gợi ý milestone");
        }
        subscriptionService.consumeAiCredit(userId, eventId, "SUGGEST_MILESTONES");

        Event event = getEvent(eventId);
        List<Department> departments = departmentRepository.findAllByEventIdOrderByNameAsc(eventId);
        List<Task> existingTasks = taskRepository.findAllByEventIdWithDetails(eventId);
        int count = resolveCount(request, 4);
        Map<String, Object> input = baseInput(event, departments, existingTasks, request);
        input.put("existingMilestones", loadMilestoneInputs(eventId));

        Set<String> usedNames = existingMilestoneNames(input);
        Optional<JsonNode> aiJson = openAiAssistantClient.generateJson(
                milestoneInstructions(count),
                input);

        return AiMilestoneSuggestionResponse.builder()
                .milestones(aiJson
                        .map(json -> parseMilestones(json.path("milestones"), event, usedNames, count))
                        .filter(items -> !items.isEmpty())
                        .orElseGet(() -> fallbackMilestones(event, usedNames, count)))
                .build();
    }

    @Transactional
    public AiCalendarSuggestionResponse suggestCalendarItems(Long eventId, Long userId, AiSuggestionRequest request) {
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ leader của sự kiện mới được gợi ý lịch");
        }
        subscriptionService.consumeAiCredit(userId, eventId, "SUGGEST_CALENDAR");

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

    @Transactional
    public AiSubtaskSuggestionResponse suggestSubtasks(Long taskId, Long userId, AiSuggestionRequest request) {
        Task parentTask = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        Long eventId = parentTask.getEvent().getId();
        if (!canSuggestWorkForTask(parentTask, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ leader của sự kiện hoặc trưởng ban mới được gợi ý subtask");
        }
        subscriptionService.consumeAiCredit(userId, eventId, "SUGGEST_SUBTASKS");

        List<Department> departments = departmentRepository.findAllByEventIdOrderByNameAsc(eventId);
        int count = resolveCount(request, 5);
        Map<String, Object> input = baseInput(parentTask.getEvent(), departments, List.of(parentTask), request);
        input.put("parentTask", taskInput(parentTask));

        Optional<JsonNode> aiJson = openAiAssistantClient.generateJson(subtaskInstructions(count), input);

        return AiSubtaskSuggestionResponse.builder()
                .subtasks(aiJson
                        .map(json -> parseTasks(json.path("subtasks"), eventStartTime(parentTask.getEvent()), parentTask.getDeadline(), departments, count))
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
        String userInstruction = request != null ? normalizeOptionalText(request.getInstruction()) : null;
        input.put("event", eventInput(event));
        input.put("existingDepartments", departments.stream().map(this::departmentInput).toList());
        input.put("existingTasks", tasks == null ? List.of() : tasks.stream().map(this::taskInput).toList());
        input.put("userInstruction", userInstruction);
        input.put("userContext", userContextInput(userInstruction));
        input.put("requestedCount", request != null ? request.getCount() : null);
        return input;
    }

    private Map<String, Object> userContextInput(String userInstruction) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("rawText", userInstruction);
        data.put("hasExplicitContext", userInstruction != null && !userInstruction.isBlank());
        data.put("priority", "User context is the strongest signal. Use event/task data to ground it, not to override it.");
        data.put("antiTemplateRule", "Do not use generic event templates unless the user context is missing or asks for a generic structure.");
        return data;
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
        data.put("eventType", event.getEventType());
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
        data.put("assigneeName", task.getAssignee() != null ? task.getAssignee().getName() : null);
        data.put("milestoneId", task.getMilestone() != null ? task.getMilestone().getId() : null);
        data.put("milestoneName", task.getMilestone() != null ? task.getMilestone().getName() : null);
        data.put("parentId", task.getParent() != null ? task.getParent().getId() : null);
        data.put("status", task.getStatus());
        data.put("priority", task.getPriority());
        data.put("deadline", task.getDeadline());
        data.put("progressPercentage", task.getProgressPercentage());
        return data;
    }


    private String departmentInstructions(int count) {
        return """
                Bạn là AI gợi ý dữ liệu cho EventFlow. Chỉ trả JSON object, không markdown.
                %s
                Dựa trên thông tin event và các department hiện có, gợi ý tối đa %d department mới.
                Không tạo milestone hoặc trường ngoài database hiện tại.
                Nếu userContext.hasExplicitContext=true, tên và mô tả department phải bám sát ngôn ngữ, mục tiêu, ràng buộc và vai trò user đã nêu.
                Không tự thêm các ban mẫu như Nội dung, Truyền thông, Hậu cần nếu context không cần những mảng đó.
                Đây là gợi ý để user chọn lưu hàng loạt, nên cần bao phủ đúng khoảng trống tổ chức thật sự đang thiếu.
                JSON phải có dạng:
                {"departments":[{"name":"...", "description":"...", "leaderUserId":null}]}
                name tối đa 100 ký tự, description tối đa 1000 ký tự.
                Tuyệt đối không đề xuất department trùng hoặc gần trùng tên với existingDepartments.
                """.formatted(contextualSuggestionRules(), count);
    }

    private String taskInstructions(int count) {
        return """
                Bạn là AI gợi ý dữ liệu cho EventFlow. Chỉ trả JSON object, không markdown.
                %s
                Dựa trên event, department hiện có, task hiện có và userContext, gợi ý tối đa %d task có thể lưu bằng API hiện tại.
                Nếu userContext.hasExplicitContext=true, mỗi task phải là việc cụ thể xuất phát trực tiếp từ text user đưa, không chuyển về checklist sự kiện chung.
                Description của task phải nêu cách làm cụ thể: các bước chính, đầu ra cần bàn giao, tiêu chí hoàn thành hoặc lưu ý phối hợp.
                Không dùng milestoneName hoặc trường ngoài database hiện tại.
                Nếu chọn department thì departmentId phải lấy từ existingDepartments; nếu không chắc thì để null.
                assigneeId để null. status mặc định TODO. progressPercentage mặc định 0.
                deadline là ISO local datetime, nằm trong khoảng event.startTime đến event.endTime.
                Tránh đề xuất task trùng ý với existingTasks; nếu context yêu cầu mở rộng việc đang có, hãy tạo task bổ sung rõ khác biệt.
                JSON phải có dạng:
                {"tasks":[{"title":"...", "description":"Cách làm: ... Đầu ra: ... Hoàn thành khi: ...", "departmentId":1, "assigneeId":null, "status":"TODO", "priority":"HIGH", "deadline":"2026-07-09T17:00:00", "progressPercentage":0}]}
                priority chỉ được là LOW, MEDIUM, HIGH hoặc URGENT.
                """.formatted(contextualSuggestionRules(), count);
    }

    private String milestoneInstructions(int count) {
        return """
                Bạn là AI gợi ý dữ liệu cho EventFlow. Chỉ trả JSON object, không markdown.
                %s
                Dựa trên event, department hiện có, task hiện có, milestone hiện có, gợi ý tối đa %d milestone.
                Milestone là chặng kiểm soát tiến độ hoặc điểm nghiệm thu quan trọng của event, khác với task.
                Dùng các trường có thể lưu bằng API Milestone hiện tại: name, description, expectedDeadline, expectedResult, priority, status.
                Không tạo task, không dùng departmentId, assigneeId hoặc trường ngoài API Milestone CRUD hiện tại.
                expectedDeadline là ISO local datetime, nằm trong khoảng event.startTime đến event.endTime nếu có.
                Tránh trùng hoặc gần trùng name với existingMilestones.
                Nếu userContext.hasExplicitContext=true, milestone phải được suy ra từ mốc nghiệm thu thật trong context user đưa và task hiện có.
                Không mặc định dùng các mốc setup/rehearsal/tổng kết nếu event hoặc userContext không nhắc tới.
                Description phải giải thích milestone này kiểm soát điều gì; expectedResult phải là kết quả nghiệm thu cụ thể.
                JSON phải có dạng:
                {"milestones":[{"name":"...", "description":"...", "expectedDeadline":"2026-07-09T17:00:00", "expectedResult":"...", "priority":"HIGH", "status":"TODO"}]}
                name tối đa 255 ký tự. description và expectedResult tối đa 2000 ký tự.
                priority chỉ được là LOW, MEDIUM, HIGH hoặc URGENT. status chỉ được là TODO, IN_PROGRESS, DONE hoặc CANCELLED.
                """.formatted(contextualSuggestionRules(), count);
    }

    private String subtaskInstructions(int count) {
        return """
                Bạn là AI gợi ý dữ liệu cho EventFlow. Chỉ trả JSON object, không markdown.
                %s
                Dựa trên parentTask, chia thành tối đa %d subtask có thể lưu bằng API tạo subtask hiện tại.
                Nếu userContext.hasExplicitContext=true, hãy dùng context đó để chia nhỏ đúng cách làm user muốn, không chia theo checklist chung.
                Không dùng milestone hoặc trường ngoài database hiện tại.
                departmentId và assigneeId để null vì backend sẽ kế thừa từ task cha.
                status mặc định TODO, progressPercentage mặc định 0, priority kế thừa hoặc phù hợp với task cha.
                deadline là ISO local datetime, không trước event.startTime và không sau parentTask.deadline.
                Mỗi description phải nêu thao tác cụ thể và output của subtask.
                JSON phải có dạng:
                {"subtasks":[{"title":"...", "description":"...", "departmentId":null, "assigneeId":null, "status":"TODO", "priority":"MEDIUM", "deadline":"2026-07-09T17:00:00", "progressPercentage":0}]}
                """.formatted(contextualSuggestionRules(), count);
    }

    private String calendarInstructions(int count) {
        return """
                Bạn là AI gợi ý dữ liệu cho EventFlow. Chỉ trả JSON object, không markdown.
                %s
                Dựa trên event, department và task hiện có, gợi ý tối đa %d lịch có thể lưu bằng API calendar hiện tại.
                Không dùng milestone hoặc trường ngoài database hiện tại.
                Nếu userContext.hasExplicitContext=true, lịch phải bám sát thời điểm, người/ban, địa điểm và mục đích user nêu.
                Không tự trải đều các mốc họp/setup/rehearsal/check-in nếu context không cần.
                Không đề xuất lịch trùng hoặc gần trùng title + thời gian với existingCalendarItems.
                Nếu chọn department thì departmentId phải lấy từ existingDepartments; nếu không chắc thì để null.
                attendeeIds để [] trừ khi userInstruction chỉ rõ thành viên cụ thể.
                startTime/endTime là ISO local datetime, nằm trong khoảng event.startTime đến event.endTime, endTime phải sau startTime.
                JSON phải có dạng:
                {"calendarItems":[{"title":"...", "description":"...", "location":"...", "type":"MEETING", "departmentId":1, "startTime":"2026-07-09T09:00:00", "endTime":"2026-07-09T10:00:00", "allDay":false, "status":"SCHEDULED", "meetingUrl":"", "attendeeIds":[]}]}
                type chỉ dùng MEETING, REHEARSAL, SETUP, CHECKIN hoặc OTHER. status mặc định SCHEDULED.
                """.formatted(contextualSuggestionRules(), count);
    }

    private String contextualSuggestionRules() {
        return """
                Quy tắc context:
                - userContext.rawText là ưu tiên cao nhất khi không mâu thuẫn với dữ liệu event hoặc API.
                - Nếu userContext.rawText có chi tiết cụ thể, dùng chính chi tiết đó để đặt tên, mô tả, deadline, priority và phạm vi gợi ý.
                - Không bịa dữ liệu không có trong input; nếu thiếu dữ liệu thì để null hoặc chọn giá trị an toàn được API cho phép.
                - Không trả gợi ý chung chung theo template. Mỗi gợi ý phải gắn với event, existingDepartments, existingTasks hoặc userContext.
                - Tránh lặp lại item đã tồn tại; ưu tiên lấp khoảng trống thực tế trong dữ liệu hiện có.
                """;
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

    private List<MilestoneRequestDTO> parseMilestones(JsonNode items, Event event, Set<String> usedNames, int count) {
        if (!items.isArray()) {
            return List.of();
        }

        return streamJson(items)
                .map(item -> new MilestoneRequestDTO(
                        limitText(item.path("name").asText(""), 255),
                        limitText(item.path("description").asText(null), 2000),
                        resolveMilestoneDeadline(item.path("expectedDeadline").asText(null), event),
                        limitText(item.path("expectedResult").asText(null), 2000),
                        resolvePriority(item.path("priority").asText(null)),
                        resolveMilestoneStatus(item.path("status").asText(null))))
                .filter(item -> item.getName() != null && !item.getName().isBlank())
                .filter(item -> usedNames.add(normalizeName(item.getName())))
                .limit(count)
                .toList();
    }

    private List<TaskRequestDTO> parseTasks(JsonNode items, Event event, List<Department> departments, int count) {
        return parseTasks(items, eventStartTime(event), eventEndTime(event), departments, count);
    }

    private List<TaskRequestDTO> parseTasks(JsonNode items, LocalDateTime latestAllowed, List<Department> departments, int count) {
        return parseTasks(items, null, latestAllowed, departments, count);
    }

    private List<TaskRequestDTO> parseTasks(JsonNode items, LocalDateTime earliestAllowed, LocalDateTime latestAllowed, List<Department> departments, int count) {
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
                    task.setDeadline(resolveDeadline(item.path("deadline").asText(null), earliestAllowed, latestAllowed));
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
                .map(item -> {
                    LocalDateTime startTime = resolveCalendarStart(item.path("startTime").asText(null), earliestAllowed, latestAllowed);
                    LocalDateTime endTime = resolveCalendarEnd(item.path("endTime").asText(null), startTime, latestAllowed);
                    return calendarItem(
                            limitText(item.path("title").asText(""), 255),
                            limitText(item.path("description").asText(null), 2000),
                            limitText(item.path("location").asText(event.getLocation()), 255),
                            resolveCalendarType(item.path("type").asText(null)),
                            resolveDepartmentId(item.path("departmentId"), departments),
                            startTime,
                            endTime,
                            item.path("allDay").asBoolean(false),
                            resolveCalendarStatus(item.path("status").asText(null)));
                })
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

    private String resolveMilestoneStatus(String status) {
        if (status == null || status.isBlank()) {
            return "TODO";
        }
        String normalized = status.trim().toUpperCase();
        return switch (normalized) {
            case "TODO", "IN_PROGRESS", "DONE", "CANCELLED" -> normalized;
            default -> "TODO";
        };
    }

    private Integer resolveOrderIndex(JsonNode orderIndexNode) {
        if (!orderIndexNode.isNumber()) {
            return 0;
        }
        return Math.max(orderIndexNode.asInt(), 0);
    }

    private LocalDateTime resolveDeadline(String value, LocalDateTime earliestAllowed, LocalDateTime latestAllowed) {
        LocalDateTime fallback = latestAllowed != null
                ? latestAllowed
                : (earliestAllowed != null ? earliestAllowed : LocalDateTime.now().plusDays(1).withSecond(0).withNano(0));
        LocalDateTime parsed = parseLocalDateTime(value, fallback);
        return clampDateTime(parsed, earliestAllowed, latestAllowed);
    }

    private LocalDateTime resolveMilestoneDeadline(String value, Event event) {
        LocalDateTime earliestAllowed = event.getEventDate();
        LocalDateTime latestAllowed = eventEndTime(event);
        LocalDateTime fallback = latestAllowed != null
                ? latestAllowed
                : LocalDateTime.now().plusDays(7).withHour(17).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime parsed = parseLocalDateTime(value, fallback);
        return clampDateTime(parsed, earliestAllowed, latestAllowed);
    }

    private LocalDateTime resolveCalendarStart(String value, LocalDateTime earliestAllowed, LocalDateTime latestAllowed) {
        LocalDateTime fallback = earliestAllowed != null ? earliestAllowed : LocalDateTime.now().plusDays(1).withHour(9).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime parsed = clampDateTime(parseLocalDateTime(value, fallback), earliestAllowed, latestAllowed);
        if (latestAllowed == null || parsed.isBefore(latestAllowed)) {
            return parsed;
        }
        LocalDateTime adjustedStart = latestAllowed.minusHours(1);
        return earliestAllowed != null && adjustedStart.isBefore(earliestAllowed) ? earliestAllowed : adjustedStart;
    }

    private LocalDateTime resolveCalendarEnd(String endValue, LocalDateTime start, LocalDateTime latestAllowed) {
        LocalDateTime fallback = start.plusHours(1);
        LocalDateTime parsed = clampDateTime(parseLocalDateTime(endValue, fallback), start, latestAllowed);
        if (!parsed.isAfter(start)) {
            parsed = fallback;
        }
        parsed = clampDateTime(parsed, start, latestAllowed);
        if (!parsed.isAfter(start) && latestAllowed != null && latestAllowed.isAfter(start)) {
            return latestAllowed;
        }
        return parsed;
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

    private LocalDateTime eventStartTime(Event event) {
        return event.getEventDate();
    }

    private LocalDateTime clampDateTime(LocalDateTime value, LocalDateTime earliestAllowed, LocalDateTime latestAllowed) {
        LocalDateTime effectiveLatest = latestAllowed;
        if (earliestAllowed != null && latestAllowed != null && latestAllowed.isBefore(earliestAllowed)) {
            effectiveLatest = earliestAllowed;
        }
        LocalDateTime result = value;
        if (earliestAllowed != null && result.isBefore(earliestAllowed)) {
            result = earliestAllowed;
        }
        if (effectiveLatest != null && result.isAfter(effectiveLatest)) {
            result = effectiveLatest;
        }
        return result;
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

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
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

    private List<MilestoneRequestDTO> fallbackMilestones(Event event, Set<String> usedNames, int count) {
        LocalDateTime start = event.getEventDate() != null
                ? event.getEventDate()
                : LocalDateTime.now().plusDays(7).withHour(9).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = eventEndTime(event);
        LocalDateTime finalDeadline = end != null && end.isAfter(start) ? end : start.plusDays(14);
        long totalDays = Math.max(java.time.Duration.between(start, finalDeadline).toDays(), 4);

        List<MilestoneRequestDTO> suggestions = List.of(
                milestone(
                        "Chốt phạm vi và kế hoạch vận hành",
                        "Xác nhận mục tiêu, phạm vi, timeline tổng thể, các ban phụ trách và tiêu chí hoàn thành của event.",
                        start.plusDays(Math.max(totalDays / 4, 1)),
                        "Scope, timeline, owner chính và tiêu chí thành công được thống nhất.",
                        "HIGH"),
                milestone(
                        "Hoàn tất chuẩn bị nguồn lực",
                        "Kiểm tra nội dung, nhân sự, vật tư, địa điểm, truyền thông và các checklist chuẩn bị quan trọng.",
                        start.plusDays(Math.max(totalDays / 2, 2)),
                        "Các hạng mục chuẩn bị chính sẵn sàng để chuyển sang chạy thử hoặc vận hành.",
                        "HIGH"),
                milestone(
                        "Rehearsal và kiểm tra vận hành",
                        "Chạy thử agenda, setup kỹ thuật, luồng check-in, phân công trực và phương án xử lý phát sinh.",
                        finalDeadline.minusDays(1),
                        "Kịch bản vận hành được kiểm chứng, các rủi ro chính có phương án xử lý.",
                        "URGENT"),
                milestone(
                        "Vận hành và tổng kết sự kiện",
                        "Theo dõi ngày diễn ra event, ghi nhận kết quả, vấn đề phát sinh, feedback và bài học sau sự kiện.",
                        finalDeadline,
                        "Event hoàn tất, dữ liệu tổng kết và feedback được thu thập.",
                        "MEDIUM"));

        return suggestions.stream()
                .map(item -> new MilestoneRequestDTO(
                        item.getName(),
                        item.getDescription(),
                        resolveMilestoneDeadline(item.getExpectedDeadline() != null ? item.getExpectedDeadline().toString() : null, event),
                        item.getExpectedResult(),
                        item.getPriority(),
                        item.getStatus()))
                .filter(item -> usedNames.add(normalizeName(item.getName())))
                .limit(count)
                .toList();
    }

    private List<TaskRequestDTO> fallbackSubtasks(Task parentTask, int count) {
        LocalDateTime deadline = resolveDeadline(null, eventStartTime(parentTask.getEvent()), parentTask.getDeadline());
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
        return suggestions.stream()
                .map(item -> clampCalendarItemToEvent(item, event))
                .limit(count)
                .toList();
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

    private MilestoneRequestDTO milestone(String name, String description, LocalDateTime expectedDeadline, String expectedResult, String priority) {
        return new MilestoneRequestDTO(
                name,
                description,
                expectedDeadline,
                expectedResult,
                priority,
                "TODO");
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

    private EventCalendarItemRequest clampCalendarItemToEvent(EventCalendarItemRequest item, Event event) {
        LocalDateTime earliestAllowed = eventStartTime(event);
        LocalDateTime latestAllowed = eventEndTime(event);
        LocalDateTime startTime = resolveCalendarStart(
                item.getStartTime() != null ? item.getStartTime().toString() : null,
                earliestAllowed,
                latestAllowed);
        LocalDateTime endTime = resolveCalendarEnd(
                item.getEndTime() != null ? item.getEndTime().toString() : null,
                startTime,
                latestAllowed);
        return calendarItem(
                item.getTitle(),
                item.getDescription(),
                item.getLocation(),
                item.getType(),
                item.getDepartmentId(),
                startTime,
                endTime,
                item.getAllDay() != null ? item.getAllDay() : false,
                item.getStatus());
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

    private List<Map<String, Object>> loadMilestoneInputs(Long eventId) {
        return jdbcTemplate.queryForList("""
                SELECT name, description, expected_deadline, expected_result, priority, status
                FROM milestones
                WHERE event_id = ?
                ORDER BY expected_deadline ASC NULLS LAST, created_at ASC, id ASC
                LIMIT 100
                """, eventId);
    }


    private Set<String> existingMilestoneNames(Map<String, Object> input) {
        Set<String> names = new HashSet<>();
        Object milestones = input.get("existingMilestones");
        if (milestones instanceof List<?> items) {
            items.forEach(item -> {
                if (item instanceof Map<?, ?> milestone) {
                    Object name = milestone.get("name");
                    if (name != null) {
                        names.add(normalizeName(name.toString()));
                    }
                }
            });
        }
        return names;
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
