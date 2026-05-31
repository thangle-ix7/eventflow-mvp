package com.eventflow.backend.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentTasksDTO {
    private Long departmentId;
    private String departmentName;
    private List<TaskResponseDTO> tasks;
}
