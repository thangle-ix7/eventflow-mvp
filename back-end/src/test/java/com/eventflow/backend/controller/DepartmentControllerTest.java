package com.eventflow.backend.controller;

import com.eventflow.backend.dto.DepartmentRequestDTO;
import com.eventflow.backend.dto.DepartmentResponseDTO;
import com.eventflow.backend.dto.PageResponse;
import com.eventflow.backend.exception.GlobalExceptionHandler;
import com.eventflow.backend.security.EventSecurityService;
import com.eventflow.backend.service.DepartmentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.security.Principal;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DepartmentControllerTest {

    private final DepartmentService departmentService = mock(DepartmentService.class);
    private final EventSecurityService eventSecurityService = mock(EventSecurityService.class);
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        DepartmentController controller = new DepartmentController(departmentService, eventSecurityService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getDepartmentsReturnsPageWhenUserIsEventLeader() throws Exception {
        when(eventSecurityService.isMemberOfEvent(10L, 42L)).thenReturn(true);
        when(eventSecurityService.isLeaderOfEvent(10L, 42L)).thenReturn(true);
        when(departmentService.getDepartments(10L, 0, 50, "name", "asc", "ops"))
                .thenReturn(PageResponse.<DepartmentResponseDTO>builder()
                        .content(List.of(DepartmentResponseDTO.builder()
                                .id(1L)
                                .eventId(10L)
                                .name("Operations")
                                .build()))
                        .page(0)
                        .size(50)
                        .totalElements(1)
                        .totalPages(1)
                        .first(true)
                        .last(true)
                        .build());

        mockMvc.perform(get("/api/v1/events/10/departments")
                        .queryParam("search", "ops")
                        .principal(authenticatedUser(42L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].name").value("Operations"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void getDepartmentsReturnsOnlyMemberDepartmentWhenUserIsMember() throws Exception {
        when(eventSecurityService.isMemberOfEvent(10L, 42L)).thenReturn(true);
        when(eventSecurityService.isLeaderOfEvent(10L, 42L)).thenReturn(false);
        when(departmentService.getDepartmentsForMember(10L, 42L, 0, 50, "ops"))
                .thenReturn(PageResponse.<DepartmentResponseDTO>builder()
                        .content(List.of(DepartmentResponseDTO.builder()
                                .id(2L)
                                .eventId(10L)
                                .name("Member Department")
                                .build()))
                        .page(0)
                        .size(50)
                        .totalElements(1)
                        .totalPages(1)
                        .first(true)
                        .last(true)
                        .build());

        mockMvc.perform(get("/api/v1/events/10/departments")
                        .queryParam("search", "ops")
                        .principal(authenticatedUser(42L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].name").value("Member Department"));
    }

    @Test
    void createDepartmentReturnsForbiddenWhenUserIsNotLeader() throws Exception {
        when(eventSecurityService.isLeaderOfEvent(10L, 42L)).thenReturn(false);

        mockMvc.perform(post("/api/v1/events/10/departments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DepartmentRequestDTO("Operations")))
                        .principal(authenticatedUser(42L)))
                .andExpect(status().isForbidden());
    }

    @Test
    void createDepartmentValidatesRequestBodyBeforeServiceCall() throws Exception {
        when(eventSecurityService.isLeaderOfEvent(10L, 42L)).thenReturn(true);

        mockMvc.perform(post("/api/v1/events/10/departments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DepartmentRequestDTO("")))
                        .principal(authenticatedUser(42L)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.name").exists());
    }

    @Test
    void createDepartmentReturnsCreatedResponse() throws Exception {
        when(eventSecurityService.isLeaderOfEvent(10L, 42L)).thenReturn(true);
        when(departmentService.createDepartment(10L, new DepartmentRequestDTO("Operations")))
                .thenReturn(DepartmentResponseDTO.builder()
                        .id(1L)
                        .eventId(10L)
                        .name("Operations")
                        .build());

        mockMvc.perform(post("/api/v1/events/10/departments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DepartmentRequestDTO("Operations")))
                        .principal(authenticatedUser(42L)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Operations"));

        verify(departmentService).createDepartment(10L, new DepartmentRequestDTO("Operations"));
    }

    private Principal authenticatedUser(Long userId) {
        TestingAuthenticationToken authentication = new TestingAuthenticationToken(userId, null);
        authentication.setAuthenticated(true);
        return authentication;
    }
}
