package com.eventflow.backend.service;

import com.eventflow.backend.dto.AiActionDraft;
import com.eventflow.backend.dto.AiChatMessage;
import com.eventflow.backend.dto.AiChatRequest;
import com.eventflow.backend.dto.AiChatResponse;
import com.eventflow.backend.dto.AiPageContext;
import com.eventflow.backend.dto.AiTaskDraft;
import com.eventflow.backend.dto.EventRequestDTO;
import com.eventflow.backend.dto.EventResponseDTO;
import com.eventflow.backend.dto.TaskRequestDTO;
import com.eventflow.backend.security.EventSecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AiAssistantService {

    private static final Pattern HOUR_PATTERN = Pattern.compile("(\\d{1,2})\\s*(h|:00|giờ)", Pattern.CASE_INSENSITIVE);
    private static final Pattern ISO_DATE_PATTERN = Pattern.compile("(\\d{4}-\\d{2}-\\d{2})(?:[ T](\\d{1,2})(?::(\\d{2}))?)?");
    private static final Pattern VN_DATE_PATTERN = Pattern.compile("(\\d{1,2})/(\\d{1,2})/(\\d{4})(?:\\s+(\\d{1,2})(?::(\\d{2}))?)?");
    private static final Pattern VN_DAY_MONTH_PATTERN = Pattern.compile("(\\d{1,2})\\s*/\\s*(\\d{1,2})(?:\\s*/\\s*(\\d{4}))?");
    private static final Pattern MONTH_WORD_PATTERN = Pattern.compile("(?:tháng|thang)\\s*(\\d{1,2})", Pattern.CASE_INSENSITIVE);
    private static final Pattern DAY_WORD_PATTERN = Pattern.compile("(?:ngày|ngay)\\s*(\\d{1,2})", Pattern.CASE_INSENSITIVE);

    private final EventService eventService;
    private final TaskService taskService;
    private final EventSecurityService eventSecurityService;
    private final OpenAiEventflowAssistantClient openAiAssistantClient;

    @Transactional
    public AiChatResponse chat(AiChatRequest request, Long userId) {
        String message = request.getMessage() == null ? "" : request.getMessage().trim();
        String normalizedMessage = normalize(message);
        AiActionDraft draft = request.getDraft() != null ? request.getDraft() : newDraft();
        applyContextToDraft(draft, request.getContext());
        normalizeDraft(draft);
        if (!hasActiveAction(draft)) {
            AiActionDraft resumedDraft = resumeDraftFromHistory(request);
            if (resumedDraft != null) {
                draft = resumedDraft;
                applyContextToDraft(draft, request.getContext());
                normalizeDraft(draft);
            }
        }

        if (isCancel(normalizedMessage)) {
            return AiChatResponse.builder()
                    .reply("Đã hủy yêu cầu hiện tại. Bạn muốn tạo sự kiện hoặc task nào tiếp theo?")
                    .draft(newDraft())
                    .build();
        }

        if (hasActiveAction(draft) && isCreateNow(normalizedMessage)) {
            if (isReady(draft)) {
                return executeDraft(draft, userId);
            }
            if ("CREATE_EVENT_WITH_TASKS".equals(draft.getIntent()) && isEventCoreReady(draft)) {
                draft.setTasksSkipped(true);
            }
            if (isReady(draft)) {
                return executeDraft(draft, userId);
            }
        }

        if (hasActiveAction(draft) && asksForGuidance(normalizedMessage)) {
            AiChatResponse suggestedTasksResponse = suggestTasksIfReady(draft);
            if (suggestedTasksResponse != null) {
                return suggestedTasksResponse;
            }
            return AiChatResponse.builder()
                    .reply(buildGuidanceForDraft(draft))
                    .draft(draft)
                    .readyToConfirm(false)
                    .targetEventId(draft.getTargetEventId())
                    .build();
        }

        if (hasActiveAction(draft) && isAffirmative(normalizedMessage)) {
            if (isReady(draft)) {
                return executeDraft(draft, userId);
            }
            String nextQuestion = nextQuestion(draft);
            return AiChatResponse.builder()
                    .reply(buildActionFollowUp(draft, nextQuestion))
                    .draft(draft)
                    .readyToConfirm(false)
                    .targetEventId(draft.getTargetEventId())
                    .build();
        }

        if (hasActiveAction(draft) && shouldApplyToActiveDraft(normalizedMessage, draft)) {
            applyMessageToDraft(message, normalizedMessage, draft);
            String nextQuestion = nextQuestion(draft);
            if (nextQuestion != null) {
                return AiChatResponse.builder()
                        .reply(nextQuestion)
                        .draft(draft)
                        .readyToConfirm(false)
                        .targetEventId(draft.getTargetEventId())
                        .build();
            }
            return AiChatResponse.builder()
                    .reply(buildConfirmationMessage(draft))
                    .draft(draft)
                    .readyToConfirm(true)
                    .targetEventId(draft.getTargetEventId())
                    .build();
        }

        var aiResponse = openAiAssistantClient.plan(request);
        if (aiResponse.isPresent()) {
            AiChatResponse response = aiResponse.get();
            AiActionDraft aiDraft = response.getDraft() != null ? response.getDraft() : draft;
            applyContextToDraft(aiDraft, request.getContext());
            normalizeDraft(aiDraft);

            if (!isActionIntent(aiDraft.getIntent())) {
                if (looksLikeActionRequest(normalizedMessage)) {
                    AiActionDraft actionDraft = hasActiveAction(draft) ? draft : newDraft();
                    applyMessageToDraft(message, normalizedMessage, actionDraft);
                    String nextQuestion = nextQuestion(actionDraft);
                    return AiChatResponse.builder()
                            .reply(buildActionFollowUp(actionDraft, nextQuestion))
                            .draft(actionDraft)
                            .readyToConfirm(false)
                            .targetEventId(actionDraft.getTargetEventId())
                            .build();
                }
                if (hasActiveAction(draft) && asksForGuidance(normalizedMessage)) {
                    AiChatResponse suggestedTasksResponse = suggestTasksIfReady(draft);
                    if (suggestedTasksResponse != null) {
                        return suggestedTasksResponse;
                    }
                    return AiChatResponse.builder()
                            .reply(buildGuidanceForDraft(draft))
                            .draft(draft)
                            .readyToConfirm(false)
                            .targetEventId(draft.getTargetEventId())
                            .build();
                }
                response.setDraft(hasActiveAction(draft) ? draft : newDraft());
                response.setReadyToConfirm(false);
                response.setTargetEventId(null);
                if (isBlank(response.getReply())) {
                    response.setReply("Mình có thể tư vấn, gợi ý kế hoạch, hoặc khi bạn muốn thì mình sẽ chuyển thành sự kiện/task để tạo trong hệ thống.");
                }
                return response;
            }

            response.setDraft(aiDraft);
            response.setTargetEventId(aiDraft.getTargetEventId());

            if (isConfirm(normalizedMessage) && isReady(aiDraft)) {
                return executeDraft(aiDraft, userId);
            }
            if (isBlank(response.getReply())) {
                String nextQuestion = nextQuestion(aiDraft);
                response.setReply(nextQuestion != null ? nextQuestion : buildConfirmationMessage(aiDraft));
            }
            if (isReady(aiDraft)) {
                if (isCreateNow(normalizedMessage)) {
                    return executeDraft(aiDraft, userId);
                }
                response.setReadyToConfirm(true);
                if (!response.getReply().contains("xác nhận")) {
                    response.setReply(response.getReply() + "\n\nNhắn \"xác nhận\" để tạo thật, hoặc \"hủy\" để bỏ.");
                }
            }
            return response;
        }

        if (isConfirm(normalizedMessage) && isReady(draft)) {
            return executeDraft(draft, userId);
        }

        if (!hasActiveAction(draft) && !looksLikeActionRequest(normalizedMessage)) {
            return AiChatResponse.builder()
                    .reply(buildLocalChatReply(message, normalizedMessage))
                    .draft(newDraft())
                    .readyToConfirm(false)
                    .build();
        }

        applyMessageToDraft(message, normalizedMessage, draft);
        String nextQuestion = nextQuestion(draft);
        if (isCreateNow(normalizedMessage) && isReady(draft)) {
            return executeDraft(draft, userId);
        }
        if (nextQuestion != null) {
            return AiChatResponse.builder()
                    .reply(nextQuestion)
                    .draft(draft)
                    .readyToConfirm(false)
                    .build();
        }

        return AiChatResponse.builder()
                .reply(buildConfirmationMessage(draft))
                .draft(draft)
                .readyToConfirm(true)
                .build();
    }

    private AiChatResponse executeDraft(AiActionDraft draft, Long userId) {
        if ("CREATE_TASKS_FOR_EVENT".equals(draft.getIntent())) {
            return executeTaskDraft(draft, userId);
        }
        if (!"CREATE_EVENT_WITH_TASKS".equals(draft.getIntent())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yêu cầu AI chưa phải thao tác có thể thực thi");
        }

        EventResponseDTO event = eventService.createEvent(new EventRequestDTO(
                draft.getEventName(),
                draft.getEventDescription(),
                draft.getLocation(),
                draft.getStartTime(),
                draft.getStartTime(),
                "ACTIVE"), userId);

        for (AiTaskDraft taskDraft : draft.getTasks()) {
            TaskRequestDTO taskRequest = new TaskRequestDTO();
            taskRequest.setTitle(taskDraft.getTitle());
            taskRequest.setDescription(taskDraft.getDescription());
            taskRequest.setDeadline(taskDraft.getDeadline() != null ? taskDraft.getDeadline() : draft.getStartTime());
            taskRequest.setStatus("TODO");
            taskRequest.setProgressPercentage(0);
            taskService.createTask(event.getId(), taskRequest);
        }

        String reply = "Đã tạo sự kiện \"" + event.getName() + "\"";
        if (!draft.getTasks().isEmpty()) {
            reply += " và " + draft.getTasks().size() + " task liên quan.";
        } else {
            reply += ".";
        }

        return AiChatResponse.builder()
                .reply(reply)
                .draft(newDraft())
                .completed(true)
                .createdEvent(event)
                .targetEventId(event.getId())
                .createdTaskCount(draft.getTasks().size())
                .build();
    }

    private AiChatResponse executeTaskDraft(AiActionDraft draft, Long userId) {
        Long eventId = draft.getTargetEventId();
        if (eventId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chưa xác định sự kiện để tạo task");
        }
        if (!eventSecurityService.isLeaderOfEvent(eventId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ leader của sự kiện mới được tạo task bằng AI");
        }
        if (draft.getTasks() == null || draft.getTasks().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chưa có task để tạo");
        }

        for (AiTaskDraft taskDraft : draft.getTasks()) {
            TaskRequestDTO taskRequest = new TaskRequestDTO();
            taskRequest.setTitle(taskDraft.getTitle());
            taskRequest.setDescription(taskDraft.getDescription());
            taskRequest.setDeadline(taskDraft.getDeadline() != null ? taskDraft.getDeadline() : LocalDateTime.now().plusDays(1));
            taskRequest.setStatus("TODO");
            taskRequest.setProgressPercentage(0);
            taskService.createTask(eventId, taskRequest);
        }

        return AiChatResponse.builder()
                .reply("Đã tạo " + draft.getTasks().size() + " task cho sự kiện hiện tại.")
                .draft(newDraft())
                .completed(true)
                .targetEventId(eventId)
                .createdTaskCount(draft.getTasks().size())
                .build();
    }

    private void applyMessageToDraft(String message, String normalizedMessage, AiActionDraft draft) {
        if (draft.getIntent() == null) {
            if (normalizedMessage.contains("tạo") && normalizedMessage.contains("sự kiện")) {
                draft.setIntent("CREATE_EVENT_WITH_TASKS");
                extractInitialEventInfo(message, normalizedMessage, draft);
            } else if (normalizedMessage.contains("tạo") && (normalizedMessage.contains("task") || normalizedMessage.contains("công việc"))) {
                draft.setIntent("CREATE_TASKS_FOR_EVENT");
                extractInitialEventInfo(message, normalizedMessage, draft);
            } else {
                draft.setStep("intent");
            }
            return;
        }

        switch (String.valueOf(draft.getStep())) {
            case "eventName" -> draft.setEventName(cleanAnswer(message));
            case "startTime" -> applyStartTimeMessage(draft, message);
            case "location" -> {
                if (isSkip(normalizedMessage)) {
                    draft.setLocationSkipped(true);
                } else {
                    draft.setLocation(cleanAnswer(message));
                }
            }
            case "tasks" -> {
                if (isSkip(normalizedMessage)) {
                    draft.setTasksSkipped(true);
                } else if (asksForGuidance(normalizedMessage)) {
                    addSuggestedTasksIfUseful(draft);
                } else {
                    draft.setTasks(parseTasks(message, draft.getStartTime()));
                }
            }
            default -> extractInitialEventInfo(message, normalizedMessage, draft);
        }
    }

    private void extractInitialEventInfo(String message, String normalizedMessage, AiActionDraft draft) {
        if (draft.getEventName() == null && normalizedMessage.contains("sự kiện")) {
            String name = message.replaceFirst("(?i).*?sự kiện", "").trim();
            name = name.replaceFirst("(?i)^cho tôi", "").trim();
            name = trimBeforeKeywords(name, List.of(" ngày ", " vào ", " lúc ", " tại ", " ở ", " gồm ", " task ", " công việc "));
            if (!name.isBlank()) {
                draft.setEventName(cleanAnswer(name));
            }
        }

        if (draft.getStartTime() == null) {
            applyStartTimeMessage(draft, message);
        }

        if (draft.getLocation() == null) {
            String location = extractAfterAny(message, normalizedMessage, List.of(" tại ", " ở "));
            if (location != null) {
                location = trimBeforeKeywords(location, List.of(" gồm ", " task ", " công việc "));
                if (!location.isBlank()) {
                    draft.setLocation(cleanAnswer(location));
                }
            }
        }

        if (draft.getTasks().isEmpty() && (normalizedMessage.contains("task") || normalizedMessage.contains("công việc"))) {
            String taskPart = extractAfterAny(message, normalizedMessage, List.of("task", "công việc"));
            if (taskPart != null) {
                draft.setTasks(parseTasks(taskPart, draft.getStartTime()));
            }
        }
    }

    private String nextQuestion(AiActionDraft draft) {
        if (draft.getIntent() == null || "intent".equals(draft.getStep())) {
            draft.setStep("intent");
            return "Bạn muốn AI làm gì? Tôi hỗ trợ tạo sự kiện kèm task, hoặc tạo task cho sự kiện hiện tại.";
        }

        if ("CREATE_TASKS_FOR_EVENT".equals(draft.getIntent())) {
            if (draft.getTargetEventId() == null) {
                draft.setStep("targetEvent");
                return "Bạn muốn tạo task cho sự kiện nào? Hãy mở trang task của sự kiện hoặc nhập eventId.";
            }
            if (draft.getTasks() == null || draft.getTasks().isEmpty()) {
                draft.setStep("tasks");
                return "Bạn muốn tạo những task nào? Có thể nói tự nhiên, ví dụ: tạo task trang trí sân khấu tone hồng, chuẩn bị bóng bay và backdrop.";
            }
            draft.setStep("confirm");
            return null;
        }

        if (isBlank(draft.getEventName())) {
            draft.setStep("eventName");
            return "Tên sự kiện là gì?";
        }

        if (draft.getStartTime() == null) {
            draft.setStep("startTime");
            return buildStartTimeQuestion(draft);
        }

        if (isBlank(draft.getLocation()) && !Boolean.TRUE.equals(draft.getLocationSkipped())) {
            draft.setStep("location");
            return "Địa điểm tổ chức ở đâu? Bạn có thể nhắn \"bỏ qua\" nếu chưa có.";
        }

        if ((draft.getTasks() == null || draft.getTasks().isEmpty()) && !Boolean.TRUE.equals(draft.getTasksSkipped())) {
            draft.setStep("tasks");
            return "Bạn muốn tự nhập task, để mình gợi ý checklist task phù hợp, hay bỏ qua task? Bạn có thể nhắn \"gợi ý giúp tôi\", nhập task cách nhau bằng dấu phẩy, hoặc nhắn \"bỏ qua\".";
        }

        draft.setStep("confirm");
        return null;
    }

    private String buildConfirmationMessage(AiActionDraft draft) {
        StringBuilder builder = new StringBuilder();
        if ("CREATE_TASKS_FOR_EVENT".equals(draft.getIntent())) {
            builder.append("Tôi sẽ tạo task cho sự kiện #").append(draft.getTargetEventId()).append(":\n");
        } else {
            builder.append("Tôi sẽ tạo sự kiện:\n");
            builder.append("- Tên: ").append(draft.getEventName()).append("\n");
            builder.append("- Bắt đầu: ").append(draft.getStartTime()).append("\n");
            builder.append("- Địa điểm: ").append(isBlank(draft.getLocation()) ? "Chưa có" : draft.getLocation()).append("\n");
        }
        if (!draft.getTasks().isEmpty()) {
            builder.append("- Task:\n");
            for (AiTaskDraft task : draft.getTasks()) {
                builder.append("  + ").append(task.getTitle()).append("\n");
            }
        } else {
            builder.append("- Task: chưa tạo task kèm theo\n");
        }
        builder.append("Nhắn \"xác nhận\" để tạo thật, hoặc \"hủy\" để bỏ.");
        return builder.toString();
    }

    private List<AiTaskDraft> parseTasks(String message, LocalDateTime defaultDeadline) {
        String normalized = message
                .replaceFirst("(?i)^[:\\-\\s]+", "")
                .replace(";", ",")
                .replace(" và ", ",");
        String[] parts = normalized.split(",");
        List<AiTaskDraft> tasks = new ArrayList<>();
        for (String part : parts) {
            String title = cleanAnswer(part);
            if (!title.isBlank()) {
                tasks.add(AiTaskDraft.builder()
                        .title(title)
                        .description("Task được tạo từ AI assistant")
                        .deadline(defaultDeadline)
                        .build());
            }
        }
        return tasks;
    }

    private void addSuggestedTasksIfUseful(AiActionDraft draft) {
        if (draft == null || !"CREATE_EVENT_WITH_TASKS".equals(draft.getIntent())) {
            return;
        }
        if (draft.getTasks() != null && !draft.getTasks().isEmpty()) {
            return;
        }
        draft.setTasks(suggestTasksForEvent(draft));
    }

    private List<AiTaskDraft> suggestTasksForEvent(AiActionDraft draft) {
        String eventName = normalize(draft.getEventName());
        LocalDateTime startTime = draft.getStartTime() != null ? draft.getStartTime() : LocalDateTime.now().plusDays(7);

        if (eventName.contains("giải chạy") || eventName.contains("giai chay")
                || eventName.contains("run") || eventName.contains("marathon")) {
            return List.of(
                    task("Xin phép tổ chức và chốt cung đường chạy", "Làm việc với nhà trường/bảo vệ để duyệt thời gian, phạm vi đường chạy và phương án phân luồng.", startTime.minusDays(14)),
                    task("Thiết kế route, sơ đồ check-in và khu vực gửi đồ", "Xác định cự ly, điểm xuất phát/kết thúc, vị trí booth check-in, nước uống và gửi đồ.", startTime.minusDays(10)),
                    task("Tuyển và phân công volunteer", "Phân vai check-in, dẫn đường, tiếp nước, y tế, media, hậu cần và điều phối khu vực.", startTime.minusDays(7)),
                    task("Chuẩn bị bib, vòng tay và bộ race-kit", "Thiết kế/in số bib, chuẩn bị kim băng, nước, quà tặng hoặc vật phẩm cho người tham gia.", startTime.minusDays(5)),
                    task("Truyền thông và mở form đăng ký", "Đăng bài truyền thông, cập nhật thông tin cự ly, thời gian, địa điểm và deadline đăng ký.", startTime.minusDays(5)),
                    task("Chuẩn bị y tế, nước uống và an toàn đường chạy", "Bố trí điểm nước, túi y tế, người trực hỗ trợ và phương án xử lý sự cố.", startTime.minusDays(3)),
                    task("Setup khu vực sự kiện trước giờ chạy", "Dựng backdrop, bàn check-in, biển chỉ dẫn, âm thanh và khu vực tập trung.", startTime.minusDays(1)),
                    task("Tổng duyệt vận hành giải chạy", "Chạy thử quy trình check-in, xuất phát, điều phối route, trao giải và dọn dẹp sau sự kiện.", startTime.minusHours(12)));
        }

        return List.of(
                task("Chốt concept và phạm vi sự kiện", "Xác định mục tiêu, đối tượng tham gia, quy mô, timeline và tiêu chí thành công.", startTime.minusDays(10)),
                task("Lập timeline vận hành", "Chia các mốc chuẩn bị, setup, chạy chương trình và nghiệm thu sau sự kiện.", startTime.minusDays(7)),
                task("Phân công nhân sự phụ trách", "Phân vai điều phối, hậu cần, truyền thông, check-in, media và xử lý sự cố.", startTime.minusDays(5)),
                task("Chuẩn bị truyền thông và form đăng ký", "Soạn nội dung truyền thông, thiết kế poster và mở form thu thập người tham gia.", startTime.minusDays(4)),
                task("Setup địa điểm và checklist vật dụng", "Chuẩn bị bàn ghế, âm thanh, backdrop, bảng chỉ dẫn, nước uống và vật dụng cần thiết.", startTime.minusDays(1)));
    }

    private AiTaskDraft task(String title, String description, LocalDateTime deadline) {
        return AiTaskDraft.builder()
                .title(title)
                .description(description)
                .deadline(deadline)
                .build();
    }

    private AiChatResponse suggestTasksIfReady(AiActionDraft draft) {
        if (!"CREATE_EVENT_WITH_TASKS".equals(draft.getIntent()) || !isEventCoreReady(draft)) {
            return null;
        }
        addSuggestedTasksIfUseful(draft);
        return AiChatResponse.builder()
                .reply("Mình đã gợi ý checklist task phù hợp cho sự kiện này:\n\n" + buildConfirmationMessage(draft))
                .draft(draft)
                .readyToConfirm(true)
                .targetEventId(draft.getTargetEventId())
                .build();
    }

    private boolean isEventCoreReady(AiActionDraft draft) {
        return draft != null
                && !isBlank(draft.getEventName())
                && draft.getStartTime() != null
                && (!isBlank(draft.getLocation()) || Boolean.TRUE.equals(draft.getLocationSkipped()));
    }

    private AiActionDraft resumeDraftFromHistory(AiChatRequest request) {
        if (request == null || request.getMessages() == null || request.getMessages().isEmpty()) {
            return null;
        }

        String lastAssistantText = lastAssistantText(request.getMessages());
        if (isBlank(lastAssistantText) || !asksForEventDetails(normalize(lastAssistantText))) {
            return null;
        }

        String eventName = inferEventNameFromHistory(request.getMessages(), lastAssistantText);
        if (isBlank(eventName)) {
            return null;
        }

        String normalizedAssistant = normalize(lastAssistantText);
        String step = normalizedAssistant.contains("thời gian")
                || normalizedAssistant.contains("thoi gian")
                || normalizedAssistant.contains("diễn ra")
                || normalizedAssistant.contains("dien ra")
                ? "startTime"
                : "location";

        return AiActionDraft.builder()
                .intent("CREATE_EVENT_WITH_TASKS")
                .step(step)
                .eventName(cleanAnswer(eventName))
                .eventDescription(firstSentence(lastAssistantText))
                .tasks(new ArrayList<>())
                .locationSkipped(false)
                .tasksSkipped(false)
                .build();
    }

    private String lastAssistantText(List<AiChatMessage> messages) {
        for (int i = messages.size() - 1; i >= 0; i--) {
            AiChatMessage item = messages.get(i);
            if (item != null && "assistant".equalsIgnoreCase(item.getRole()) && !isBlank(item.getText())) {
                return item.getText();
            }
        }
        return null;
    }

    private boolean asksForEventDetails(String normalizedText) {
        boolean asksRequiredDetails = normalizedText.contains("thời gian")
                || normalizedText.contains("thoi gian")
                || normalizedText.contains("diễn ra")
                || normalizedText.contains("dien ra")
                || normalizedText.contains("ở đâu")
                || normalizedText.contains("o dau")
                || normalizedText.contains("địa điểm")
                || normalizedText.contains("dia diem");
        boolean mentionsEvent = normalizedText.contains("sự kiện")
                || normalizedText.contains("su kien")
                || normalizedText.contains("workshop")
                || normalizedText.contains("seminar")
                || normalizedText.contains("giải chạy")
                || normalizedText.contains("giai chay")
                || normalizedText.contains("hội chợ")
                || normalizedText.contains("hoi cho")
                || normalizedText.contains("chương trình")
                || normalizedText.contains("chuong trinh");
        return asksRequiredDetails && mentionsEvent;
    }

    private String inferEventNameFromHistory(List<AiChatMessage> messages, String lastAssistantText) {
        String fromAssistant = inferEventNameFromText(firstSentence(lastAssistantText));
        if (!isBlank(fromAssistant)) {
            return fromAssistant;
        }

        for (int i = messages.size() - 1; i >= 0; i--) {
            AiChatMessage item = messages.get(i);
            if (item == null || !"user".equalsIgnoreCase(item.getRole()) || isBlank(item.getText())) {
                continue;
            }
            String fromUser = inferEventNameFromText(item.getText());
            if (!isBlank(fromUser)) {
                return fromUser;
            }
        }
        return null;
    }

    private String inferEventNameFromText(String text) {
        String[] eventPatterns = {
                "(?i)(workshop\\s+[^.!?\\n,]+)",
                "(?i)(seminar\\s+[^.!?\\n,]+)",
                "(?i)(giải chạy\\s+[^.!?\\n,]+)",
                "(?i)(giai chay\\s+[^.!?\\n,]+)",
                "(?i)(hội chợ\\s+[^.!?\\n,]+)",
                "(?i)(hoi cho\\s+[^.!?\\n,]+)"
        };

        for (String pattern : eventPatterns) {
            Matcher matcher = Pattern.compile(pattern).matcher(text);
            if (matcher.find()) {
                return trimBeforeKeywords(matcher.group(1), List.of(
                        " là ", " la ", " sẽ ", " se ", " vào ", " vao ", " tại ", " ở ", " o ",
                        " có ", " co ", " với ", " voi ", " để ", " de "));
            }
        }

        String normalizedText = normalize(text);
        String eventName = extractAfterAny(text, normalizedText, List.of("sự kiện", "su kien"));
        if (eventName != null) {
            eventName = trimBeforeKeywords(eventName, List.of(
                    " ngày ", " ngay ", " vào ", " vao ", " lúc ", " luc ", " tại ", " ở ", " o ",
                    " gồm ", " gom ", " task ", " công việc ", " cong viec "));
            return eventName;
        }
        return null;
    }

    private String firstSentence(String text) {
        if (text == null) {
            return null;
        }
        String[] parts = text.split("[.!?\\n]", 2);
        return parts.length == 0 ? text.trim() : parts[0].trim();
    }

    private boolean shouldApplyToActiveDraft(String normalizedMessage, AiActionDraft draft) {
        if (draft == null || isBlank(normalizedMessage) || isConversationalQuestion(normalizedMessage)) {
            return false;
        }

        String step = draft.getStep();
        if ("eventName".equals(step) || "location".equals(step) || "tasks".equals(step) || "targetEvent".equals(step)) {
            return true;
        }
        if ("startTime".equals(step)) {
            return parseStartTime(normalizedMessage) != null
                    || mentionsTimeOfDay(normalizedMessage)
                    || normalizedMessage.matches(".*\\d{1,2}\\s*/\\s*\\d{1,2}.*")
                    || normalizedMessage.matches(".*\\d{4}-\\d{2}-\\d{2}.*")
                    || wordCount(normalizedMessage) <= 5;
        }
        return draft.getStartTime() == null && parseStartTime(normalizedMessage) != null;
    }

    private boolean isConversationalQuestion(String normalizedMessage) {
        return normalizedMessage.contains("?")
                || normalizedMessage.contains("tại sao")
                || normalizedMessage.contains("tai sao")
                || normalizedMessage.contains("vì sao")
                || normalizedMessage.contains("vi sao")
                || normalizedMessage.contains("là sao")
                || normalizedMessage.contains("la sao")
                || normalizedMessage.contains("giải thích")
                || normalizedMessage.contains("giai thich");
    }

    private int wordCount(String value) {
        if (value == null || value.isBlank()) {
            return 0;
        }
        return value.trim().split("\\s+").length;
    }

    private void applyStartTimeMessage(AiActionDraft draft, String message) {
        LocalDateTime parsedTime = parseStartTime(message);
        if (parsedTime != null) {
            draft.setStartTime(parsedTime);
            draft.setStartYear(parsedTime.getYear());
            draft.setStartMonth(parsedTime.getMonthValue());
            draft.setStartDay(parsedTime.getDayOfMonth());
            draft.setStartTimeOfDay(resolveTimeOfDay(message));
            return;
        }

        updateStartTimeParts(draft, message);
        LocalDateTime completed = buildStartTimeFromParts(draft);
        if (completed != null) {
            draft.setStartTime(completed);
        }
    }

    private LocalDateTime parseStartTime(String message) {
        LocalTime time = parseHour(message);
        String normalizedMessage = normalize(message);
        if (normalizedMessage.contains("ngay bây giờ")
                || normalizedMessage.contains("ngay bay gio")
                || normalizedMessage.equals("bây giờ")
                || normalizedMessage.equals("bay gio")
                || normalizedMessage.contains("hiện tại")
                || normalizedMessage.contains("hien tai")) {
            return LocalDateTime.now().withSecond(0).withNano(0);
        }
        if (normalizedMessage.contains("ngày mai")) {
            return LocalDate.now().plusDays(1).atTime(time != null ? time : LocalTime.of(8, 0));
        }
        if (normalizedMessage.contains("hôm nay")) {
            return LocalDate.now().atTime(time != null ? time : LocalTime.of(8, 0));
        }

        LocalDateTime vietnameseTextDate = parseVietnameseTextDate(message);
        if (vietnameseTextDate != null) {
            return vietnameseTextDate;
        }

        Matcher isoMatcher = ISO_DATE_PATTERN.matcher(message);
        if (isoMatcher.find()) {
            LocalDate date = LocalDate.parse(isoMatcher.group(1));
            int hour = isoMatcher.group(2) != null ? Integer.parseInt(isoMatcher.group(2)) : (time != null ? time.getHour() : 8);
            int minute = isoMatcher.group(3) != null ? Integer.parseInt(isoMatcher.group(3)) : (time != null ? time.getMinute() : 0);
            return date.atTime(hour, minute);
        }

        Matcher vnMatcher = VN_DATE_PATTERN.matcher(message);
        if (vnMatcher.find()) {
            LocalDate date = LocalDate.of(
                    Integer.parseInt(vnMatcher.group(3)),
                    Integer.parseInt(vnMatcher.group(2)),
                    Integer.parseInt(vnMatcher.group(1)));
            int hour = vnMatcher.group(4) != null ? Integer.parseInt(vnMatcher.group(4)) : (time != null ? time.getHour() : 8);
            int minute = vnMatcher.group(5) != null ? Integer.parseInt(vnMatcher.group(5)) : (time != null ? time.getMinute() : 0);
            return date.atTime(hour, minute);
        }

        try {
            return LocalDateTime.parse(message, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private LocalDateTime parseVietnameseTextDate(String message) {
        Matcher monthMatcher = MONTH_WORD_PATTERN.matcher(message);
        Matcher dayMatcher = DAY_WORD_PATTERN.matcher(message);
        if (!monthMatcher.find() || !dayMatcher.find()) {
            return null;
        }

        int month = Integer.parseInt(monthMatcher.group(1));
        int day = Integer.parseInt(dayMatcher.group(1));
        if (!isValidMonthDay(month, day)) {
            return null;
        }

        int year = resolveYear(month, day);
        return LocalDate.of(year, month, day).atTime(resolveApproximateTime(message));
    }

    private void updateStartTimeParts(AiActionDraft draft, String message) {
        String normalizedMessage = normalize(message);
        Matcher dayMonthMatcher = VN_DAY_MONTH_PATTERN.matcher(normalizedMessage);
        if (dayMonthMatcher.find()) {
            draft.setStartDay(Integer.parseInt(dayMonthMatcher.group(1)));
            draft.setStartMonth(Integer.parseInt(dayMonthMatcher.group(2)));
            if (dayMonthMatcher.group(3) != null) {
                draft.setStartYear(Integer.parseInt(dayMonthMatcher.group(3)));
            }
        }

        Matcher monthMatcher = MONTH_WORD_PATTERN.matcher(normalizedMessage);
        if (monthMatcher.find()) {
            draft.setStartMonth(Integer.parseInt(monthMatcher.group(1)));
        }

        Matcher dayMatcher = DAY_WORD_PATTERN.matcher(normalizedMessage);
        if (dayMatcher.find()) {
            draft.setStartDay(Integer.parseInt(dayMatcher.group(1)));
        }

        if (draft.getStartTimeOfDay() == null || parseHour(message) != null || mentionsTimeOfDay(normalizedMessage)) {
            draft.setStartTimeOfDay(resolveTimeOfDay(message));
        }
    }

    private LocalDateTime buildStartTimeFromParts(AiActionDraft draft) {
        if (draft.getStartMonth() == null || draft.getStartDay() == null) {
            return null;
        }

        int month = draft.getStartMonth();
        int day = draft.getStartDay();
        if (!isValidMonthDay(month, day)) {
            return null;
        }

        int year = draft.getStartYear() != null ? draft.getStartYear() : resolveYear(month, day);
        return LocalDate.of(year, month, day).atTime(resolveApproximateTime(draft.getStartTimeOfDay()));
    }

    private String buildStartTimeQuestion(AiActionDraft draft) {
        if (draft.getStartMonth() != null && draft.getStartDay() == null) {
            return "Bạn muốn tổ chức ngày nào trong tháng " + draft.getStartMonth() + "? Ví dụ: ngày 15, hoặc 15/7.";
        }

        if (draft.getStartDay() != null && draft.getStartMonth() == null) {
            return "Bạn muốn tổ chức ngày " + draft.getStartDay() + " của tháng nào?";
        }

        return "Thời gian bắt đầu sự kiện là khi nào? Ví dụ: ngày mai 8h, 15/7 buổi tối, hoặc 2026-06-05 09:00.";
    }

    private LocalTime parseHour(String message) {
        Matcher matcher = HOUR_PATTERN.matcher(message);
        if (!matcher.find()) {
            return null;
        }
        int hour = Math.min(Math.max(Integer.parseInt(matcher.group(1)), 0), 23);
        return LocalTime.of(hour, 0);
    }

    private LocalTime resolveApproximateTime(String value) {
        LocalTime exactTime = parseHour(value);
        if (exactTime != null) {
            return exactTime;
        }

        String timeOfDay = resolveTimeOfDay(value);
        return switch (timeOfDay) {
            case "MORNING" -> LocalTime.of(8, 0);
            case "NOON" -> LocalTime.of(12, 0);
            case "AFTERNOON" -> LocalTime.of(14, 0);
            case "EVENING" -> LocalTime.of(19, 0);
            default -> LocalTime.of(8, 0);
        };
    }

    private String resolveTimeOfDay(String value) {
        String normalizedValue = normalize(value);
        if (parseHour(value) != null) {
            return "EXACT";
        }
        if (normalizedValue.contains("sáng") || normalizedValue.contains("sang")) {
            return "MORNING";
        }
        if (normalizedValue.contains("trưa") || normalizedValue.contains("trua")) {
            return "NOON";
        }
        if (normalizedValue.contains("chiều") || normalizedValue.contains("chieu")) {
            return "AFTERNOON";
        }
        if (normalizedValue.contains("tối") || normalizedValue.contains("toi")) {
            return "EVENING";
        }
        return "UNKNOWN";
    }

    private boolean mentionsTimeOfDay(String normalizedValue) {
        return normalizedValue.contains("sáng")
                || normalizedValue.contains("sang")
                || normalizedValue.contains("trưa")
                || normalizedValue.contains("trua")
                || normalizedValue.contains("chiều")
                || normalizedValue.contains("chieu")
                || normalizedValue.contains("tối")
                || normalizedValue.contains("toi");
    }

    private int resolveYear(int month, int day) {
        LocalDate now = LocalDate.now();
        int year = now.getYear();
        LocalDate date = LocalDate.of(year, month, day);
        return date.isBefore(now) ? year + 1 : year;
    }

    private boolean isValidMonthDay(int month, int day) {
        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return false;
        }
        try {
            LocalDate.of(LocalDate.now().getYear(), month, day);
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    private AiActionDraft newDraft() {
        return AiActionDraft.builder()
                .intent(null)
                .step(null)
                .tasks(new ArrayList<>())
                .locationSkipped(false)
                .tasksSkipped(false)
                .build();
    }

    private boolean isReady(AiActionDraft draft) {
        if (draft != null && "CREATE_TASKS_FOR_EVENT".equals(draft.getIntent())) {
            return draft.getTargetEventId() != null
                    && draft.getTasks() != null
                    && !draft.getTasks().isEmpty();
        }

        return draft != null
                && !isBlank(draft.getEventName())
                && draft.getStartTime() != null
                && (!isBlank(draft.getLocation()) || Boolean.TRUE.equals(draft.getLocationSkipped()))
                && ((draft.getTasks() != null && !draft.getTasks().isEmpty()) || Boolean.TRUE.equals(draft.getTasksSkipped()));
    }

    private boolean isActionIntent(String intent) {
        return "CREATE_EVENT_WITH_TASKS".equals(intent) || "CREATE_TASKS_FOR_EVENT".equals(intent);
    }

    private boolean hasActiveAction(AiActionDraft draft) {
        return draft != null && isActionIntent(draft.getIntent());
    }

    private boolean looksLikeActionRequest(String normalizedMessage) {
        return normalizedMessage.contains("tạo")
                && (normalizedMessage.contains("sự kiện")
                || normalizedMessage.contains("su kien")
                || normalizedMessage.contains("task")
                || normalizedMessage.contains("công việc")
                || normalizedMessage.contains("cong viec"));
    }

    private String buildLocalChatReply(String message, String normalizedMessage) {
        if (normalizedMessage.contains("hello") || normalizedMessage.contains("hi") || normalizedMessage.contains("xin chào") || normalizedMessage.contains("xin chao")) {
            return "Chào bạn. Mình có thể gợi ý ý tưởng sự kiện, lập kế hoạch, chia task, hoặc khi bạn muốn thì tạo sự kiện/task trực tiếp trong EventFlow.";
        }

        if (normalizedMessage.contains("gợi ý") || normalizedMessage.contains("goi y") || normalizedMessage.contains("không biết") || normalizedMessage.contains("khong biet")) {
            if (normalizedMessage.contains("giải chạy") || normalizedMessage.contains("giai chay") || normalizedMessage.contains("running")) {
                return """
                        Gợi ý cho một giải chạy:
                        - Chủ đề: Run For Green, FPTU Night Run, hoặc Charity Run.
                        - Cự ly: 3km cho người mới, 5km phổ thông, 10km thử thách.
                        - Khu vực cần chuẩn bị: đăng ký, check-in, gửi đồ, nước uống, y tế, media, an ninh đường chạy.
                        - Task mẫu: xin phép địa điểm, thiết kế route, tuyển volunteer, chuẩn bị bib, truyền thông, setup booth, phân công chốt đường chạy.

                        Nếu bạn muốn, hãy nhắn: "Tạo sự kiện giải chạy ..." hoặc "Tạo các task này" để mình chuyển thành draft tạo thật.
                        """;
            }
            return "Mình có thể gợi ý ý tưởng, timeline, danh sách task, nhân sự và checklist vận hành. Bạn muốn gợi ý cho loại sự kiện nào?";
        }

        return "Mình hiểu. Bạn có thể hỏi mình để brainstorm kế hoạch, gợi ý task, viết mô tả sự kiện, hoặc nhắn rõ \"tạo sự kiện\" / \"tạo task\" khi muốn lưu vào hệ thống.";
    }

    private boolean asksForGuidance(String normalizedMessage) {
        return normalizedMessage.contains("chưa biết")
                || normalizedMessage.contains("chua biet")
                || normalizedMessage.contains("không biết")
                || normalizedMessage.contains("khong biet")
                || normalizedMessage.contains("hướng dẫn")
                || normalizedMessage.contains("huong dan")
                || normalizedMessage.contains("mới bắt đầu")
                || normalizedMessage.contains("moi bat dau")
                || normalizedMessage.contains("gợi ý")
                || normalizedMessage.contains("goi y");
    }

    private String buildActionFollowUp(AiActionDraft draft, String nextQuestion) {
        String eventName = isBlank(draft.getEventName()) ? "sự kiện này" : draft.getEventName();
        if ("CREATE_EVENT_WITH_TASKS".equals(draft.getIntent())) {
            return "Được, mình sẽ giúp bạn tạo draft cho " + eventName + ". "
                    + "Trước khi tạo thật, mình cần đủ thông tin cơ bản.\n\n"
                    + (nextQuestion != null ? nextQuestion : buildConfirmationMessage(draft));
        }
        return nextQuestion != null ? nextQuestion : buildConfirmationMessage(draft);
    }

    private String buildGuidanceForDraft(AiActionDraft draft) {
        if ("CREATE_EVENT_WITH_TASKS".equals(draft.getIntent())) {
            String eventName = isBlank(draft.getEventName()) ? "sự kiện" : draft.getEventName();
            return """
                    Không sao, mình sẽ dẫn bạn từng bước. Với %s, bạn có thể bắt đầu bằng khung đơn giản:
                    - Mục tiêu: chạy phong trào, gây quỹ, quảng bá CLB/khoa, hoặc tăng gắn kết sinh viên.
                    - Quy mô: nội bộ FPTU, toàn trường, hoặc mở rộng cho khách mời.
                    - Cự ly: 3km dễ tham gia, 5km phổ thông, 10km thử thách.
                    - Khu vực cần chuẩn bị: đăng ký, check-in, gửi đồ, nước uống, y tế, media, an ninh đường chạy.
                    - Task mẫu: xin phép địa điểm, thiết kế route, tuyển volunteer, chuẩn bị bib, truyền thông, setup booth.

                    Để tạo draft trong hệ thống, trước hết bạn chọn giúp mình thời gian tổ chức dự kiến. Ví dụ: "ngày mai 8h", "15/7 buổi sáng", hoặc "cuối tuần này 7h".
                    """.formatted(eventName);
        }

        return "Không sao, bạn mô tả mục tiêu hoặc bối cảnh hiện tại, mình sẽ giúp chia thành danh sách task rõ ràng trước rồi mới hỏi xác nhận để tạo thật.";
    }

    private void normalizeDraft(AiActionDraft draft) {
        if (draft == null) {
            return;
        }
        if (draft.getTasks() == null) {
            draft.setTasks(new ArrayList<>());
        }
        if (draft.getLocationSkipped() == null) {
            draft.setLocationSkipped(false);
        }
        if (draft.getTasksSkipped() == null) {
            draft.setTasksSkipped(false);
        }
        if ("NONE".equals(draft.getIntent()) || "CHAT".equals(draft.getIntent())) {
            draft.setIntent(null);
            draft.setStep(null);
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String cleanAnswer(String value) {
        return value == null ? "" : value.trim()
                .replaceFirst("(?i)^là\\s+", "")
                .replaceFirst("(?i)^gồm\\s+", "")
                .trim();
    }

    private boolean isConfirm(String message) {
        return message.equals("xác nhận") || message.equals("xac nhan") || message.equals("ok") || message.equals("đồng ý") || message.equals("tao that") || message.equals("tạo thật");
    }

    private boolean isAffirmative(String message) {
        return message.equals("có")
                || message.equals("co")
                || message.equals("được")
                || message.equals("duoc")
                || message.equals("đúng")
                || message.equals("dung")
                || message.equals("ok")
                || message.equals("yes")
                || message.equals("ừ")
                || message.equals("uh")
                || message.equals("ừm")
                || message.equals("um");
    }

    private boolean isCreateNow(String message) {
        return message.equals("tạo luôn")
                || message.equals("tao luon")
                || message.equals("tạo đi")
                || message.equals("tao di")
                || message.equals("cứ tạo")
                || message.equals("cu tao")
                || message.equals("cứ tạo đi")
                || message.equals("cu tao di")
                || message.equals("tạo các task này")
                || message.equals("tao cac task nay")
                || message.equals("tạo hết")
                || message.equals("tao het")
                || message.equals("lưu lại")
                || message.equals("luu lai");
    }

    private boolean isCancel(String message) {
        return message.equals("hủy") || message.equals("huy") || message.equals("cancel");
    }

    private boolean isSkip(String message) {
        return message.equals("bỏ qua") || message.equals("bo qua") || message.equals("chưa có") || message.equals("không");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String trimBeforeKeywords(String value, List<String> keywords) {
        String result = value;
        for (String keyword : keywords) {
            int index = result.indexOf(keyword);
            if (index >= 0) {
                result = result.substring(0, index);
            }
        }
        return result.trim();
    }

    private String extractAfterAny(String value, String normalizedValue, List<String> keywords) {
        for (String keyword : keywords) {
            int index = normalizedValue.indexOf(keyword);
            if (index >= 0) {
                return value.substring(index + keyword.length()).trim();
            }
        }
        return null;
    }

    private void applyContextToDraft(AiActionDraft draft, AiPageContext context) {
        if (draft == null || context == null) {
            return;
        }
        if (draft.getTargetEventId() == null && context.getEventId() != null) {
            draft.setTargetEventId(context.getEventId());
        }
    }
}
