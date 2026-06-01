package com.eventflow.backend.service;

import com.eventflow.backend.dto.AiActionDraft;
import com.eventflow.backend.dto.AiChatMessage;
import com.eventflow.backend.dto.AiChatRequest;
import com.eventflow.backend.dto.AiChatResponse;
import com.eventflow.backend.security.EventSecurityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiAssistantServiceTest {

    @Mock
    private EventService eventService;

    @Mock
    private TaskService taskService;

    @Mock
    private EventSecurityService eventSecurityService;

    @Mock
    private OpenAiEventflowAssistantClient openAiAssistantClient;

    private AiAssistantService aiAssistantService;

    @BeforeEach
    void setUp() {
        aiAssistantService = new AiAssistantService(
                eventService,
                taskService,
                eventSecurityService,
                openAiAssistantClient);
    }

    @Test
    void chatSuggestionDoesNotCreateActionDraftWhenAiIsUnavailable() {
        when(openAiAssistantClient.plan(any(AiChatRequest.class))).thenReturn(Optional.empty());

        var response = aiAssistantService.chat(
                new AiChatRequest("Tôi không biết hãy gợi ý cho giải chạy", null, null),
                1L);

        assertThat(response.getReply()).contains("Gợi ý cho một giải chạy");
        assertThat(response.getDraft().getIntent()).isNull();
        assertThat(response.isReadyToConfirm()).isFalse();
        verifyNoInteractions(eventService, taskService, eventSecurityService);
    }

    @Test
    void createEventRequestOverridesGenericAiReply() {
        when(openAiAssistantClient.plan(any(AiChatRequest.class))).thenReturn(Optional.of(
                AiChatResponse.builder()
                        .reply("Bạn muốn AI làm gì? Tôi hỗ trợ tạo sự kiện kèm task, hoặc tạo task cho sự kiện hiện tại.")
                        .build()));

        var response = aiAssistantService.chat(
                new AiChatRequest("Tôi muốn tạo sự kiện giải chạy cho trường đại học FPTU", null, null),
                1L);

        assertThat(response.getDraft().getIntent()).isEqualTo("CREATE_EVENT_WITH_TASKS");
        assertThat(response.getDraft().getEventName()).contains("giải chạy");
        assertThat(response.getReply()).contains("mình sẽ giúp bạn tạo draft");
        assertThat(response.getReply()).contains("Thời gian bắt đầu");
        assertThat(response.isReadyToConfirm()).isFalse();
        verifyNoInteractions(eventService, taskService, eventSecurityService);
    }

    @Test
    void createRunningEventAsksBeforeSuggestingTasks() {
        when(openAiAssistantClient.plan(any(AiChatRequest.class))).thenReturn(Optional.empty());

        var response = aiAssistantService.chat(
                new AiChatRequest("Tạo sự kiện giải chạy FPTU ngày mai 8h tại sân trường", null, null),
                1L);

        assertThat(response.getDraft().getIntent()).isEqualTo("CREATE_EVENT_WITH_TASKS");
        assertThat(response.getDraft().getTasks()).isEmpty();
        assertThat(response.getReply()).contains("Bạn muốn tự nhập task");
        assertThat(response.isReadyToConfirm()).isFalse();
        verifyNoInteractions(eventService, taskService, eventSecurityService);
    }

    @Test
    void suggestsMultipleTasksOnlyAfterUserAsksForHelp() {
        AiActionDraft draft = AiActionDraft.builder()
                .intent("CREATE_EVENT_WITH_TASKS")
                .step("tasks")
                .eventName("giải chạy FPTU")
                .location("sân trường")
                .startTime(LocalDateTime.now().plusDays(10))
                .build();

        var response = aiAssistantService.chat(
                new AiChatRequest("gợi ý giúp tôi", draft, null),
                1L);

        assertThat(response.getDraft().getTasks()).hasSizeGreaterThan(1);
        assertThat(response.getReply()).contains("Mình đã gợi ý checklist task");
        assertThat(response.getReply()).contains("Xin phép tổ chức");
        assertThat(response.isReadyToConfirm()).isTrue();
        verifyNoInteractions(eventService, taskService, eventSecurityService);
    }

    @Test
    void affirmativeAnswerContinuesActiveDraftInsteadOfStartingGenericChat() {
        AiActionDraft draft = AiActionDraft.builder()
                .intent("CREATE_EVENT_WITH_TASKS")
                .eventName("Hội chợ giới thiệu sản phẩm nến thơm")
                .eventDescription("Giới thiệu sản phẩm nến thơm và thu hút khách hàng tiềm năng")
                .build();

        var response = aiAssistantService.chat(
                new AiChatRequest("có", draft, null),
                1L);

        assertThat(response.getDraft().getIntent()).isEqualTo("CREATE_EVENT_WITH_TASKS");
        assertThat(response.getReply()).contains("Thời gian bắt đầu");
        assertThat(response.isReadyToConfirm()).isFalse();
        verifyNoInteractions(eventService, taskService, eventSecurityService, openAiAssistantClient);
    }

    @Test
    void shortTimeAnswerUsesActiveDraftBeforeCallingAi() {
        AiActionDraft draft = AiActionDraft.builder()
                .intent("CREATE_EVENT_WITH_TASKS")
                .step("startTime")
                .eventName("workshop nến thơm")
                .build();

        var response = aiAssistantService.chat(
                new AiChatRequest("ngay bây giờ", draft, null),
                1L);

        assertThat(response.getDraft().getIntent()).isEqualTo("CREATE_EVENT_WITH_TASKS");
        assertThat(response.getDraft().getStartTime()).isNotNull();
        assertThat(response.getReply()).contains("Địa điểm");
        verifyNoInteractions(eventService, taskService, eventSecurityService, openAiAssistantClient);
    }

    @Test
    void shortTimeAnswerCanResumeDraftFromConversationHistory() {
        var history = List.of(
                new AiChatMessage("user", "mục tiêu là để giới thiệu sản phẩm nến thơm"),
                new AiChatMessage("assistant", "Tổ chức workshop nến thơm là ý tưởng tuyệt vời! Workshop của bạn sẽ diễn ra vào thời gian nào và ở đâu?"),
                new AiChatMessage("user", "ngay bây giờ"));

        var response = aiAssistantService.chat(
                new AiChatRequest("ngay bây giờ", null, null, history),
                1L);

        assertThat(response.getDraft().getIntent()).isEqualTo("CREATE_EVENT_WITH_TASKS");
        assertThat(response.getDraft().getEventName()).containsIgnoringCase("workshop nến thơm");
        assertThat(response.getDraft().getStartTime()).isNotNull();
        assertThat(response.getReply()).contains("Địa điểm");
        verifyNoInteractions(eventService, taskService, eventSecurityService, openAiAssistantClient);
    }
}
