package com.eventflow.backend.service;

import com.eventflow.backend.dto.TemplateInstantiateRequestDTO;
import com.eventflow.backend.entity.*;
import com.eventflow.backend.repository.DepartmentRepository;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.TaskRepository;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TemplateInstantiationService {

    private final EventRepository eventRepository;
    private final DepartmentRepository departmentRepository;
    private final TaskRepository taskRepository;
    private final EventMemberRepository eventMemberRepository;
    private final UserRepository userRepository;

    /**
     * Nhân bản Template thành Event thực tế (Deep Clone)
     * Theo kế hoạch: Clone Event + Departments + Tasks (với Batch Insert)
     */
    @Transactional
    public Event instantiateTemplate(Long templateId, TemplateInstantiateRequestDTO request, Long userId) {
        // 1. Validate template tồn tại và là TEMPLATE
        Event template = eventRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template không tồn tại với ID: " + templateId));

        if (template.getNature() != EventNature.TEMPLATE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event ID " + templateId + " không phải là Template");
        }

        // Validate user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng không hợp lệ"));

        // 2. Clone Event từ Template sang NORMAL
        Event newEvent = Event.builder()
                .name(request.getName())
                .description(request.getDescription())
                .location(request.getLocation())
                .eventDate(request.getEventDate())
                .endTime(request.getEndTime())
                .nature(EventNature.NORMAL)
                .status("DRAFT")
                .contextDescription(template.getContextDescription())
                .objective(template.getObjective())
                .expectedAttendees(template.getExpectedAttendees())
                .scale(template.getScale())
                .createdAt(LocalDateTime.now())
                .build();

        newEvent = eventRepository.save(newEvent);
        log.info("Created new event from template. Event ID: {}, Template ID: {}", newEvent.getId(), templateId);

        // Gán user làm Leader của event mới
        EventMember leader = eventMemberRepository.save(EventMember.builder()
                .event(newEvent)
                .user(user)
                .role(UserRole.LEADER)
                .build());

        log.info("Assigned user {} as LEADER of event {}", userId, newEvent.getId());

        // 3. Clone Departments
        List<Department> templateDepartments = departmentRepository.findAllByEventIdOrderByNameAsc(templateId);
        Map<Long, Department> oldDeptIdToNewDept = new HashMap<>();

        for (Department oldDept : templateDepartments) {
            Department newDept = Department.builder()
                    .event(newEvent)
                    .name(oldDept.getName())
                    .description(oldDept.getDescription())
                    .leader(null) // Leader sẽ được gán sau
                    .build();

            newDept = departmentRepository.save(newDept);
            oldDeptIdToNewDept.put(oldDept.getId(), newDept);
        }

        log.info("Cloned {} departments for new event ID: {}", templateDepartments.size(), newEvent.getId());

        // 4. Clone Tasks (Batch Insert để tối ưu hiệu năng)
        List<Task> templateTasks = taskRepository.findAllByEventIdWithDetails(templateId);
        List<Task> newTasks = new ArrayList<>();
        Map<Long, Task> oldTaskIdToNewTask = new HashMap<>();

        // Xử lý task theo 2 lượt: parent tasks trước, subtasks sau
        // Lượt 1: Clone parent tasks (không có parent)
        for (Task oldTask : templateTasks) {
            if (oldTask.getParent() == null) {
                Task newTask = cloneTask(oldTask, newEvent, oldDeptIdToNewDept, null);
                newTasks.add(newTask);
            }
        }

        // Save batch parent tasks
        List<Task> savedParentTasks = taskRepository.saveAll(newTasks);

        // Map old parent ID to new parent task
        int index = 0;
        for (Task oldTask : templateTasks) {
            if (oldTask.getParent() == null) {
                oldTaskIdToNewTask.put(oldTask.getId(), savedParentTasks.get(index++));
            }
        }

        // Lượt 2: Clone subtasks
        List<Task> subtasks = new ArrayList<>();
        for (Task oldTask : templateTasks) {
            if (oldTask.getParent() != null) {
                Task newParent = oldTaskIdToNewTask.get(oldTask.getParent().getId());
                Task newTask = cloneTask(oldTask, newEvent, oldDeptIdToNewDept, newParent);
                subtasks.add(newTask);
            }
        }

        // Save batch subtasks
        if (!subtasks.isEmpty()) {
            taskRepository.saveAll(subtasks);
        }

        log.info("Cloned {} tasks for new event ID: {} using Batch Insert", templateTasks.size(), newEvent.getId());

        return newEvent;
    }

    /**
     * Clone một Task từ template
     * Reset: deadline = null, assignee = null, status = TODO, progressPercentage = 0
     */
    private Task cloneTask(Task oldTask, Event newEvent, Map<Long, Department> oldDeptIdToNewDept, Task newParent) {
        Department newDepartment = null;
        if (oldTask.getDepartment() != null) {
            newDepartment = oldDeptIdToNewDept.get(oldTask.getDepartment().getId());
        }

        return Task.builder()
                .event(newEvent)
                .department(newDepartment)
                .parent(newParent)
                .assignee(null) // Reset assignee
                .category(oldTask.getCategory())
                .milestone(null) // Milestone sẽ được gán sau
                .title(oldTask.getTitle())
                .description(oldTask.getDescription())
                .status(TaskStatus.TODO) // Reset về TODO
                .priority(oldTask.getPriority())
                .deadline(null) // Reset deadline
                .progressPercentage(0) // Reset progress
                .createdAt(LocalDateTime.now())
                .build();
    }
}
