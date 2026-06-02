package com.eventflow.backend.service;

import com.eventflow.backend.dto.TaskAttachmentResponseDTO;
import com.eventflow.backend.entity.Task;
import com.eventflow.backend.entity.TaskAttachment;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.TaskAttachmentRepository;
import com.eventflow.backend.repository.TaskRepository;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TaskAttachmentService {

    private static final long MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
    private static final Set<String> ALLOWED_ATTACHMENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "application/pdf",
            "text/plain",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    private final TaskAttachmentRepository taskAttachmentRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    @Transactional(readOnly = true)
    public List<TaskAttachmentResponseDTO> getTaskAttachments(Long taskId) {
        return taskAttachmentRepository.findAllByTaskIdWithUploader(taskId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public List<TaskAttachmentResponseDTO> uploadTaskAttachments(Long taskId, Long uploaderId, List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần chọn ít nhất một file attachment");
        }

        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        User uploader = userRepository.findById(uploaderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người upload"));

        return files.stream()
                .map(file -> {
                    StoredFile storedFile = fileStorageService.store(file, "task-attachment/" + taskId, MAX_ATTACHMENT_SIZE_BYTES, ALLOWED_ATTACHMENT_TYPES);
                    TaskAttachment attachment = TaskAttachment.builder()
                            .task(task)
                            .uploader(uploader)
                            .originalName(storedFile.originalName())
                            .contentType(storedFile.contentType())
                            .sizeBytes(storedFile.sizeBytes())
                            .storageProvider(storedFile.storageProvider())
                            .storagePath(storedFile.storagePath())
                            .build();
                    return mapToResponse(taskAttachmentRepository.save(attachment));
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskAttachmentDownload getAttachmentDownload(Long attachmentId) {
        TaskAttachment attachment = taskAttachmentRepository.findByIdWithDetails(attachmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy attachment"));

        StoredFile.Content content = fileStorageService.load(
                attachment.getStorageProvider(),
                attachment.getStoragePath(),
                attachment.getContentType(),
                attachment.getOriginalName(),
                attachment.getSizeBytes());

        return new TaskAttachmentDownload(
                content.resource(),
                content.contentType(),
                content.originalName(),
                content.sizeBytes(),
                attachment.getTask().getEvent().getId());
    }

    @Transactional(readOnly = true)
    public Long getAttachmentEventId(Long attachmentId) {
        return taskAttachmentRepository.findByIdWithDetails(attachmentId)
                .map(attachment -> attachment.getTask().getEvent().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy attachment"));
    }

    private TaskAttachmentResponseDTO mapToResponse(TaskAttachment attachment) {
        return TaskAttachmentResponseDTO.builder()
                .id(attachment.getId())
                .taskId(attachment.getTask().getId())
                .uploaderId(attachment.getUploader().getId())
                .uploaderName(attachment.getUploader().getName())
                .originalName(attachment.getOriginalName())
                .contentType(attachment.getContentType())
                .sizeBytes(attachment.getSizeBytes())
                .downloadUrl("/api/task-attachments/" + attachment.getId() + "/download")
                .createdAt(attachment.getCreatedAt())
                .build();
    }

    public record TaskAttachmentDownload(
            org.springframework.core.io.Resource resource,
            String contentType,
            String originalName,
            long sizeBytes,
            Long eventId) {
    }
}
