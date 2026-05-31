package com.eventflow.backend.service;

import com.eventflow.backend.dto.DashboardSummaryDTO;
import com.eventflow.backend.dto.DepartmentSummaryDTO;
import com.eventflow.backend.repository.DashboardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final DashboardRepository dashboardRepository;

    public DashboardSummaryDTO getEventDashboardSummary(Long eventId) {
        Long totalTasks = dashboardRepository.countTotalTasks(eventId);
        Long completedTasks = dashboardRepository.countCompletedTasks(eventId);
        Long overdueTasksCount = dashboardRepository.countOverdueTasks(eventId);
        Integer daysUntilEvent = dashboardRepository.getDaysUntilEvent(eventId);
        List<DashboardRepository.DepartmentSummaryProjection> deptProjections = dashboardRepository.getDepartmentSummaries(eventId);

        // Edge Case: Avoid division by zero
        int progressPercentage = (totalTasks != null && totalTasks > 0)
                ? (int) ((completedTasks * 100L) / totalTasks)
                : 0;

        List<DepartmentSummaryDTO> departmentSummaries = deptProjections.stream()
                .map(p -> DepartmentSummaryDTO.builder()
                        .departmentName(p.getDepartment_name())
                        .totalTasks(p.getTotal_tasks())
                        .overdueTasksCount(p.getOverdue_tasks_count())
                        .build())
                .collect(Collectors.toList());

        return DashboardSummaryDTO.builder()
                .totalTasks(totalTasks != null ? totalTasks : 0L)
                .completedTasks(completedTasks != null ? completedTasks : 0L)
                .progressPercentage(progressPercentage)
                .overdueTasksCount(overdueTasksCount != null ? overdueTasksCount : 0L)
                .daysUntilEvent(daysUntilEvent != null ? daysUntilEvent : 0)
                .departmentSummaries(departmentSummaries)
                .build();
    }
}
