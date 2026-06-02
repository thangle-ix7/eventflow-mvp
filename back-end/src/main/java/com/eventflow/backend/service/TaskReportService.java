package com.eventflow.backend.service;

import com.eventflow.backend.dto.TaskReportResponseDTO;
import com.eventflow.backend.entity.Task;
import com.eventflow.backend.entity.TaskReport;
import com.eventflow.backend.entity.TaskStatus;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.TaskReportRepository;
import com.eventflow.backend.repository.TaskRepository;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TaskReportService {

    private static final long MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");

    private final TaskReportRepository taskReportRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;
    private final FileStorageService fileStorageService;
    private final TaskService taskService;

    @Transactional(readOnly = true)
    public List<TaskReportResponseDTO> getTaskReports(Long taskId) {
        return taskReportRepository.findAllByTaskIdWithReporter(taskId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public TaskReportResponseDTO createTaskReport(
            Long taskId,
            Long reporterId,
            Integer progressPercentage,
            String description,
            MultipartFile image) {

        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người báo cáo"));
        rejectSubtaskReport(task);
        taskService.ensureManualProgressAllowed(taskId);

        StoredFile storedImage = image != null && !image.isEmpty()
                ? fileStorageService.store(image, "task-report/" + taskId, MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_TYPES)
                : null;
        TaskReport report = TaskReport.builder()
                .task(task)
                .reporter(reporter)
                .progressPercentage(validateProgress(progressPercentage))
                .description(validateDescription(description))
                .imageOriginalName(storedImage != null ? storedImage.originalName() : null)
                .imageContentType(storedImage != null ? storedImage.contentType() : null)
                .imageSizeBytes(storedImage != null ? storedImage.sizeBytes() : null)
                .imageStorageProvider(storedImage != null ? storedImage.storageProvider() : null)
                .imageStoragePath(storedImage != null ? storedImage.storagePath() : null)
                .build();

        applyProgressToTask(task, report.getProgressPercentage());
        TaskReport savedReport = taskReportRepository.save(report);
        taskService.syncParentProgressFromSubtask(task.getId());
        return mapToResponse(savedReport);
    }

    @Transactional
    public TaskReportResponseDTO updateTaskReport(
            Long reportId,
            Integer progressPercentage,
            String description,
            MultipartFile image) {

        TaskReport report = taskReportRepository.findByIdWithDetails(reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy report"));

        rejectSubtaskReport(report.getTask());
        report.setProgressPercentage(validateProgress(progressPercentage));
        report.setDescription(validateDescription(description));
        report.setUpdatedAt(LocalDateTime.now());
        taskService.ensureManualProgressAllowed(report.getTask().getId());

        if (image != null && !image.isEmpty()) {
            fileStorageService.delete(report.getImageStorageProvider(), report.getImageStoragePath());
            StoredFile storedImage = fileStorageService.store(image, "task-report/" + report.getTask().getId(), MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_TYPES);
            report.setImageOriginalName(storedImage.originalName());
            report.setImageContentType(storedImage.contentType());
            report.setImageSizeBytes(storedImage.sizeBytes());
            report.setImageStorageProvider(storedImage.storageProvider());
            report.setImageStoragePath(storedImage.storagePath());
        }

        applyProgressToTask(report.getTask(), report.getProgressPercentage());
        TaskReport savedReport = taskReportRepository.save(report);
        taskService.syncParentProgressFromSubtask(report.getTask().getId());
        return mapToResponse(savedReport);
    }

    @Transactional(readOnly = true)
    public TaskReportImage getReportImage(Long reportId) {
        TaskReport report = taskReportRepository.findByIdWithDetails(reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy report"));

        if (report.getImageStoragePath() == null || report.getImageStoragePath().isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Report không có ảnh");
        }

        StoredFile.Content content = fileStorageService.load(
                report.getImageStorageProvider(),
                report.getImageStoragePath(),
                report.getImageContentType(),
                report.getImageOriginalName(),
                report.getImageSizeBytes() != null ? report.getImageSizeBytes() : 0L);

        return new TaskReportImage(content.resource(), content.contentType(), content.originalName(), report.getTask().getEvent().getId());
    }

    @Transactional(readOnly = true)
    public Long getReportEventId(Long reportId) {
        return taskReportRepository.findByIdWithDetails(reportId)
                .map(report -> report.getTask().getEvent().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy report"));
    }

    @Transactional(readOnly = true)
    public Long getReportReporterId(Long reportId) {
        return taskReportRepository.findByIdWithDetails(reportId)
                .map(report -> report.getReporter().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy report"));
    }

    private void applyProgressToTask(Task task, Integer progressPercentage) {
        TaskStatus previousStatus = task.getStatus();
        task.setProgressPercentage(progressPercentage);
        if (progressPercentage >= 100) {
            task.setStatus(TaskStatus.DONE);
        } else if (progressPercentage > 0 && (task.getStatus() == TaskStatus.TODO || task.getStatus() == TaskStatus.DONE)) {
            task.setStatus(TaskStatus.IN_PROGRESS);
        } else if (progressPercentage == 0 && task.getStatus() == TaskStatus.DONE) {
            task.setStatus(TaskStatus.TODO);
        }
        taskRepository.save(task);
        if (previousStatus != task.getStatus()) {
            recordStatusHistory(task);
        }
    }

    private Integer validateProgress(Integer progressPercentage) {
        if (progressPercentage == null || progressPercentage < 0 || progressPercentage > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tiến độ phải nằm trong khoảng 0-100");
        }
        return progressPercentage;
    }

    private void rejectSubtaskReport(Task task) {
        if (task.getParent() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subtask chỉ cập nhật bằng trạng thái, không dùng report tiến độ");
        }
    }

    private String validateDescription(String description) {
        if (description == null || description.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mô tả report không được để trống");
        }
        return description.trim();
    }

    private void recordStatusHistory(Task task) {
        jdbcTemplate.update("""
                INSERT INTO task_status_history (task_id, event_id, department_id, status, changed_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                task.getId(),
                task.getEvent().getId(),
                task.getDepartment() != null ? task.getDepartment().getId() : null,
                task.getStatus().name());
    }

    private TaskReportResponseDTO mapToResponse(TaskReport report) {
        boolean hasImage = report.getImageStoragePath() != null && !report.getImageStoragePath().isBlank();
        return TaskReportResponseDTO.builder()
                .id(report.getId())
                .taskId(report.getTask().getId())
                .reporterId(report.getReporter().getId())
                .reporterName(report.getReporter().getName())
                .progressPercentage(report.getProgressPercentage())
                .description(report.getDescription())
                .imageOriginalName(report.getImageOriginalName())
                .imageContentType(report.getImageContentType())
                .hasImage(hasImage)
                .imageUrl(hasImage ? "/api/task-reports/" + report.getId() + "/image" : null)
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();
    }

    public record TaskReportImage(org.springframework.core.io.Resource resource, String contentType, String originalName, Long eventId) {
    }
}
