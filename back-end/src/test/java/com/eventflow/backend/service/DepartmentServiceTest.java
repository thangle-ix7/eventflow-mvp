package com.eventflow.backend.service;

import com.eventflow.backend.dto.DepartmentRequestDTO;
import com.eventflow.backend.entity.Department;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.repository.DepartmentRepository;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.EventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DepartmentServiceTest {

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private EventRepository eventRepository;

    @Mock
    private EventMemberRepository eventMemberRepository;

    private DepartmentService departmentService;

    @BeforeEach
    void setUp() {
        departmentService = new DepartmentService(departmentRepository, eventRepository, eventMemberRepository);
    }

    @Test
    void createDepartmentTrimsNameAndReturnsResponse() {
        Event event = Event.builder()
                .id(10L)
                .name("Conference")
                .eventDate(LocalDateTime.now().plusDays(10))
                .build();

        when(eventRepository.findById(10L)).thenReturn(Optional.of(event));
        when(departmentRepository.existsByEventIdAndName(10L, "Operations")).thenReturn(false);
        when(departmentRepository.save(any(Department.class))).thenAnswer(invocation -> {
            Department department = invocation.getArgument(0);
            department.setId(99L);
            return department;
        });

        var response = departmentService.createDepartment(10L, new DepartmentRequestDTO("  Operations  "));

        assertThat(response.getId()).isEqualTo(99L);
        assertThat(response.getEventId()).isEqualTo(10L);
        assertThat(response.getName()).isEqualTo("Operations");
        verify(departmentRepository).existsByEventIdAndName(10L, "Operations");
    }

    @Test
    void createDepartmentRejectsDuplicateNameInSameEvent() {
        Event event = Event.builder()
                .id(10L)
                .name("Conference")
                .eventDate(LocalDateTime.now().plusDays(10))
                .build();

        when(eventRepository.findById(10L)).thenReturn(Optional.of(event));
        when(departmentRepository.existsByEventIdAndName(10L, "Operations")).thenReturn(true);

        assertThatThrownBy(() -> departmentService.createDepartment(10L, new DepartmentRequestDTO("Operations")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409 CONFLICT");
    }
}
