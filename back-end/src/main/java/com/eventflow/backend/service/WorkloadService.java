package com.eventflow.backend.service;

import com.eventflow.backend.dto.DepartmentWorkloadResponse;
import com.eventflow.backend.dto.EventWorkloadResponse;
import com.eventflow.backend.dto.MemberWorkloadResponse;
import com.eventflow.backend.entity.Department;
import com.eventflow.backend.entity.EventMember;
import com.eventflow.backend.entity.WorkloadStatus;
import com.eventflow.backend.repository.DepartmentRepository;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * WorkloadService tính toán Workload Score runtime.
 *
 * Quyết định thiết kế MVP:
 * - Không lưu workload_score vào database.
 * - Không thêm capacity hoặc hard limit.
 * - Không chặn assign task.
 * - Chỉ tính từ số task chưa DONE đang được assign.
 */
@Service
@RequiredArgsConstructor
public class WorkloadService {

    private final TaskRepository taskRepository;
    private final EventRepository eventRepository;
    private final DepartmentRepository departmentRepository;
    private final EventMemberRepository eventMemberRepository;

    /**
     * Lấy workload chi tiết của một member trong phạm vi event.
     * Average được tính theo toàn event.
     */
    @Transactional(readOnly = true)
    public MemberWorkloadResponse getMemberWorkload(Long eventId, Long memberId) {
        ensureEventExists(eventId);

        EventMember member = eventMemberRepository.findMemberDetailByEventIdAndUserId(eventId, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy member trong event"));

        long totalMembers = eventMemberRepository.countByEventId(eventId);
        long totalAssignedTasks = taskRepository.countActiveTasksByEvent(eventId);
        double average = calculateAverage(totalAssignedTasks, totalMembers);

        return buildMemberWorkload(eventId, member, average);
    }

    /**
     * Lấy workload dashboard của một department.
     * Average được tính theo các member trong department đó.
     */
    @Transactional(readOnly = true)
    public DepartmentWorkloadResponse getDepartmentWorkload(Long eventId, Long departmentId) {
        ensureEventExists(eventId);

        Department department = departmentRepository.findByIdAndEventId(departmentId, eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy department trong event"));

        List<EventMember> members = eventMemberRepository.findAllByEventIdAndDepartmentIdWithUser(eventId, departmentId);

        long totalMembers = members.size();
        long totalAssignedTasks = taskRepository.countActiveTasksByEventAndDepartment(eventId, departmentId);
        double average = calculateAverage(totalAssignedTasks, totalMembers);

        List<MemberWorkloadResponse> memberResponses = members.stream()
                .map(member -> buildMemberWorkload(eventId, member, average))
                .toList();

        long overloadedCount = memberResponses.stream()
                .filter(member -> member.getWorkloadStatus() == WorkloadStatus.OVERLOADED)
                .count();

        double averageScore = memberResponses.stream()
                .mapToDouble(MemberWorkloadResponse::getWorkloadScore)
                .average()
                .orElse(0.0);

        return DepartmentWorkloadResponse.builder()
                .eventId(eventId)
                .departmentId(department.getId())
                .departmentName(department.getName())
                .totalMembers(totalMembers)
                .totalAssignedTasks(totalAssignedTasks)
                .teamAverageAssignedTasks(round2(average))
                .averageWorkloadScore(round2(averageScore))
                .overloadedMemberCount(overloadedCount)
                .departmentWorkloadStatus(resolveStatus(averageScore))
                .members(memberResponses)
                .build();
    }

    /**
     * Lấy workload tổng quan toàn event.
     * Response gồm danh sách workload từng department.
     */
    @Transactional(readOnly = true)
    public EventWorkloadResponse getEventWorkload(Long eventId) {
        ensureEventExists(eventId);

        List<Department> departments = departmentRepository.findAllByEventIdOrderByNameAsc(eventId);

        List<DepartmentWorkloadResponse> departmentResponses = departments.stream()
                .map(department -> getDepartmentWorkload(eventId, department.getId()))
                .toList();

        long totalDepartments = departments.size();
        long totalMembers = eventMemberRepository.countByEventId(eventId);
        long totalAssignedTasks = taskRepository.countActiveTasksByEvent(eventId);

        double averageScore = departmentResponses.stream()
                .mapToDouble(DepartmentWorkloadResponse::getAverageWorkloadScore)
                .average()
                .orElse(0.0);

        long overloadedDepartmentCount = departmentResponses.stream()
                .filter(department -> department.getDepartmentWorkloadStatus() == WorkloadStatus.OVERLOADED)
                .count();

        return EventWorkloadResponse.builder()
                .eventId(eventId)
                .totalDepartments(totalDepartments)
                .totalMembers(totalMembers)
                .totalAssignedTasks(totalAssignedTasks)
                .averageWorkloadScore(round2(averageScore))
                .overloadedDepartmentCount(overloadedDepartmentCount)
                .departments(departmentResponses)
                .build();
    }

    /**
     * Build workload cho từng member.
     *
     * Công thức:
     * workloadScore = assignedTasks / averageAssignedTasks * 100
     */
    private MemberWorkloadResponse buildMemberWorkload(
            Long eventId,
            EventMember member,
            double averageAssignedTasks) {

        Long memberId = member.getUser().getId();

        long assignedTasks = taskRepository.countActiveTasksByEventAndAssignee(eventId, memberId);
        long completedTasks = taskRepository.countDoneTasksByEventAndAssignee(eventId, memberId);

        double workloadScore = averageAssignedTasks <= 0
                ? 0.0
                : assignedTasks / averageAssignedTasks * 100;

        return MemberWorkloadResponse.builder()
                .memberId(memberId)
                .memberName(member.getUser().getName())
                .departmentId(member.getDepartment() != null ? member.getDepartment().getId() : null)
                .departmentName(member.getDepartment() != null ? member.getDepartment().getName() : "Chưa gán ban")
                .assignedTasks(assignedTasks)
                .completedTasks(completedTasks)
                .inProgressTasks(assignedTasks)
                .teamAverageAssignedTasks(round2(averageAssignedTasks))
                .workloadScore(round2(workloadScore))
                .workloadStatus(resolveStatus(workloadScore))
                .build();
    }

    /**
     * Average workload trong scope.
     * Nếu không có member thì trả 0 để tránh chia cho 0.
     */
    private double calculateAverage(long totalAssignedTasks, long totalMembers) {
        if (totalMembers <= 0) {
            return 0.0;
        }
        return (double) totalAssignedTasks / totalMembers;
    }

    /**
     * Mapping score sang status theo tài liệu MVP.
     */
    private WorkloadStatus resolveStatus(double score) {
        if (score <= 70) {
            return WorkloadStatus.LOW;
        }
        if (score <= 120) {
            return WorkloadStatus.NORMAL;
        }
        if (score <= 160) {
            return WorkloadStatus.HIGH;
        }
        return WorkloadStatus.OVERLOADED;
    }

    /**
     * Làm tròn 2 chữ số cho response frontend dễ hiển thị.
     */
    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    /**
     * Check event tồn tại trước khi tính workload.
     */
    private void ensureEventExists(Long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện");
        }
    }
}