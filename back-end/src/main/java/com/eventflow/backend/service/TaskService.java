package com.eventflow.backend.service;

import com.eventflow.backend.dto.DepartmentTasksDTO;
import com.eventflow.backend.dto.TaskResponseDTO;
import com.eventflow.backend.entity.Task;
import com.eventflow.backend.entity.TaskStatus;
import com.eventflow.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;

    public Long getEventIdByTaskId(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found with id: " + taskId));
        return task.getEvent().getId();
    }

    @Transactional(readOnly = true)
    public List<DepartmentTasksDTO> getTasksByEvent(Long eventId) {
        List<Task> tasks = taskRepository.findAllByEventIdWithDetails(eventId);

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

    @Transactional
    public Task updateStatus(Long taskId, TaskStatus status) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found with id: " + taskId));
        task.setStatus(status);
        return taskRepository.save(task);
    }

    private TaskResponseDTO mapToTaskResponse(Task task) {
        return TaskResponseDTO.builder()
                .id(task.getId())
                .title(task.getTitle())
                .status(task.getStatus())
                .deadline(task.getDeadline())
                .assigneeName(task.getAssignee() != null ? task.getAssignee().getName() : "Chưa phân công")
                .build();
    }
}
