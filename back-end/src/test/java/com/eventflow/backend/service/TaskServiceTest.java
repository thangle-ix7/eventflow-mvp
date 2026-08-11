package com.eventflow.backend.service;

import com.eventflow.backend.dto.TaskRequestDTO;
import com.eventflow.backend.dto.TaskResponseDTO;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.Task;
import com.eventflow.backend.entity.TaskPriority;
import com.eventflow.backend.entity.TaskStatus;
import com.eventflow.backend.repository.DepartmentRepository;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.MilestoneRepository;
import com.eventflow.backend.repository.TaskRepository;
import com.eventflow.backend.repository.TaskReviewRepository;
import com.eventflow.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private EventRepository eventRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private MilestoneRepository milestoneRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EventMemberRepository eventMemberRepository;

    @Mock
    private TaskReviewRepository taskReviewRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private NotificationWorkflowService notificationWorkflowService;

    @InjectMocks
    private TaskService taskService;

    @Test
    void createTaskAllowsDeadlineInsideOngoingEventEvenWhenBeforeCurrentTime() {
        LocalDateTime now = LocalDateTime.now();
        Event event = Event.builder()
                .id(10L)
                .name("Launch Day")
                .eventDate(now.minusHours(3))
                .endTime(now.plusHours(3))
                .status("ACTIVE")
                .build();
        LocalDateTime deadlineDuringEvent = now.minusHours(1);
        TaskRequestDTO request = new TaskRequestDTO();
        request.setTitle("Check in guests");
        request.setDeadline(deadlineDuringEvent);
        request.setPriority("MEDIUM");
        request.setStatus("TODO");

        when(eventRepository.findById(10L)).thenReturn(Optional.of(event));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
            Task task = invocation.getArgument(0);
            task.setId(99L);
            return task;
        });
        when(jdbcTemplate.update(anyString(), eq(99L), eq(10L), eq(null), eq(TaskStatus.TODO.name()))).thenReturn(1);

        TaskResponseDTO response = taskService.createTask(10L, request);

        assertThat(response.getId()).isEqualTo(99L);
        assertThat(response.getDeadline()).isEqualTo(deadlineDuringEvent);
        assertThat(response.getPriority()).isEqualTo(TaskPriority.MEDIUM);
    }
}
