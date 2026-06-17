package com.eventflow.backend.service;

import com.eventflow.backend.dto.TaskAttachmentResponseDTO;
import com.eventflow.backend.dto.TaskAttachmentUpdateRequest;
import com.eventflow.backend.entity.Task;
import com.eventflow.backend.entity.TaskAttachment;
import com.eventflow.backend.entity.TaskAttachmentVisibility;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.entity.UserRole;
import com.eventflow.backend.repository.EventMemberRepository;
import com.eventflow.backend.repository.TaskAttachmentRepository;
import com.eventflow.backend.repository.TaskRepository;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TaskAttachmentService {

    private static final String PROVIDER_LINK = "LINK";
    private static final int MAX_FILES_PER_UPLOAD = 10;
    private static final long MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
    private static final long MAX_ZIP_SIZE_BYTES = 50 * 1024 * 1024;
    private static final long MAX_TOTAL_TASK_ATTACHMENT_BYTES = 100 * 1024 * 1024;
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );
    private static final Set<String> ALLOWED_ZIP_TYPES = Set.of(
            "application/zip",
            "application/x-zip-compressed",
            "multipart/x-zip",
            "application/octet-stream"
    );
    private static final Set<String> ALLOWED_ATTACHMENT_TYPES = union(ALLOWED_IMAGE_TYPES, ALLOWED_ZIP_TYPES);

    private final TaskAttachmentRepository taskAttachmentRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final EventMemberRepository eventMemberRepository;
    private final FileStorageService fileStorageService;
    private final SubscriptionService subscriptionService;

    @Transactional(readOnly = true)
    public List<TaskAttachmentResponseDTO> getTaskAttachments(Long taskId, Long currentUserId) {
        return taskAttachmentRepository.findAllByTaskIdWithUploader(taskId).stream()
                .map(attachment -> mapToResponse(attachment, currentUserId))
                .toList();
    }

    @Transactional
    public List<TaskAttachmentResponseDTO> uploadTaskAttachments(
            Long taskId,
            Long uploaderId,
            boolean leader,
            String visibility,
            List<MultipartFile> files,
            String linkUrl,
            String linkTitle) {
        List<MultipartFile> uploadFiles = files == null
                ? List.of()
                : files.stream().filter(file -> file != null && !file.isEmpty()).toList();
        String normalizedLinkUrl = normalizeLinkUrl(linkUrl);

        if (uploadFiles.isEmpty() && normalizedLinkUrl == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần chọn file hoặc nhập đường dẫn attachment");
        }
        if (uploadFiles.size() > MAX_FILES_PER_UPLOAD) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ được upload tối đa 10 file mỗi lần");
        }

        Task task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task"));
        User uploader = userRepository.findById(uploaderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người upload"));
        TaskAttachmentVisibility resolvedVisibility = resolveVisibility(visibility, leader, task);

        long newUploadBytes = uploadFiles.stream().mapToLong(MultipartFile::getSize).sum();
        long currentTaskBytes = taskAttachmentRepository.sumStoredFileSizeByTaskId(taskId);
        if (currentTaskBytes + newUploadBytes > MAX_TOTAL_TASK_ATTACHMENT_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tổng dung lượng attachment của task không được vượt quá 100 MB");
        }
        subscriptionService.assertEventStorageAvailable(task.getEvent().getId(), newUploadBytes);

        List<TaskAttachmentResponseDTO> uploadedAttachments = uploadFiles.stream()
                .map(file -> {
                    long maxSizeBytes = resolveMaxSizeBytes(file);
                    StoredFile storedFile = fileStorageService.store(file, "task-attachment/" + taskId, maxSizeBytes, ALLOWED_ATTACHMENT_TYPES);
                    TaskAttachment attachment = TaskAttachment.builder()
                            .task(task)
                            .uploader(uploader)
                            .originalName(storedFile.originalName())
                            .contentType(storedFile.contentType())
                            .sizeBytes(storedFile.sizeBytes())
                            .storageProvider(storedFile.storageProvider())
                            .storagePath(storedFile.storagePath())
                            .visibility(resolvedVisibility)
                            .build();
                    return mapToResponse(taskAttachmentRepository.save(attachment), uploaderId);
                })
                .toList();

        if (normalizedLinkUrl == null) {
            return uploadedAttachments;
        }

        TaskAttachment linkAttachment = TaskAttachment.builder()
                .task(task)
                .uploader(uploader)
                .originalName(resolveLinkTitle(linkTitle, normalizedLinkUrl))
                .contentType("text/uri-list")
                .sizeBytes(0L)
                .storageProvider(PROVIDER_LINK)
                .storagePath(normalizedLinkUrl)
                .visibility(resolvedVisibility)
                .build();

        List<TaskAttachmentResponseDTO> responses = new java.util.ArrayList<>(uploadedAttachments);
        responses.add(mapToResponse(taskAttachmentRepository.save(linkAttachment), uploaderId));
        return responses;
    }

    @Transactional(readOnly = true)
    public TaskAttachmentDownload getAttachmentDownload(Long attachmentId) {
        TaskAttachment attachment = taskAttachmentRepository.findByIdWithDetails(attachmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy attachment"));
        if (isLinkAttachment(attachment)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attachment dạng đường dẫn không hỗ trợ tải xuống trực tiếp");
        }

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

    @Transactional
    public TaskAttachmentResponseDTO updateAttachment(
            Long attachmentId,
            Long currentUserId,
            boolean leader,
            TaskAttachmentUpdateRequest request) {

        TaskAttachment attachment = taskAttachmentRepository.findByIdWithDetails(attachmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy attachment"));
        if (!canEditAttachment(attachment, currentUserId, leader)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền sửa attachment này");
        }

        String normalizedName = normalizeAttachmentName(request.getOriginalName());
        if (normalizedName != null) {
            attachment.setOriginalName(normalizedName);
        }

        if (request.getExternalUrl() != null) {
            if (!isLinkAttachment(attachment)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ attachment dạng link mới được sửa URL");
            }
            attachment.setStoragePath(normalizeLinkUrl(request.getExternalUrl()));
        }

        attachment.setVisibility(resolveUpdateVisibility(request.getVisibility(), leader, attachment));
        return mapToResponse(taskAttachmentRepository.save(attachment), currentUserId);
    }

    @Transactional
    public void deleteAttachment(Long attachmentId, Long currentUserId, boolean leader) {
        TaskAttachment attachment = taskAttachmentRepository.findByIdWithDetails(attachmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy attachment"));
        if (!canEditAttachment(attachment, currentUserId, leader)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa attachment này");
        }

        if (!isLinkAttachment(attachment)) {
            fileStorageService.delete(attachment.getStorageProvider(), attachment.getStoragePath());
        }
        taskAttachmentRepository.delete(attachment);
    }

    @Transactional(readOnly = true)
    public boolean canViewAttachment(Long attachmentId, Long currentUserId) {
        return taskAttachmentRepository.findByIdWithDetails(attachmentId)
                .map(attachment -> canViewAttachment(attachment, currentUserId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy attachment"));
    }

    @Transactional(readOnly = true)
    public Long getAttachmentEventId(Long attachmentId) {
        return taskAttachmentRepository.findByIdWithDetails(attachmentId)
                .map(attachment -> attachment.getTask().getEvent().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy attachment"));
    }

    @Transactional(readOnly = true)
    public Long getAttachmentTaskId(Long attachmentId) {
        return taskAttachmentRepository.findByIdWithDetails(attachmentId)
                .map(attachment -> attachment.getTask().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy attachment"));
    }

    private TaskAttachmentResponseDTO mapToResponse(TaskAttachment attachment, Long currentUserId) {
        boolean link = isLinkAttachment(attachment);
        boolean leader = isLeaderOfAttachmentEvent(attachment, currentUserId);
        boolean canEdit = canEditAttachment(attachment, currentUserId, leader);
        return TaskAttachmentResponseDTO.builder()
                .id(attachment.getId())
                .taskId(attachment.getTask().getId())
                .uploaderId(attachment.getUploader().getId())
                .uploaderName(attachment.getUploader().getName())
                .originalName(attachment.getOriginalName())
                .contentType(attachment.getContentType())
                .sizeBytes(attachment.getSizeBytes())
                .downloadUrl(link ? null : "/api/task-attachments/" + attachment.getId() + "/download")
                .externalUrl(link ? attachment.getStoragePath() : null)
                .attachmentType(link ? "LINK" : "FILE")
                .visibility(resolveAttachmentVisibility(attachment).name())
                .canEdit(canEdit)
                .canDelete(canEdit)
                .createdAt(attachment.getCreatedAt())
                .build();
    }

    private long resolveMaxSizeBytes(MultipartFile file) {
        String contentType = normalizeContentType(file.getContentType());
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase(Locale.ROOT) : "";
        if (ALLOWED_IMAGE_TYPES.contains(contentType)
                && (filename.endsWith(".jpg") || filename.endsWith(".jpeg") || filename.endsWith(".png") || filename.endsWith(".webp"))) {
            return MAX_IMAGE_SIZE_BYTES;
        }
        if (ALLOWED_ZIP_TYPES.contains(contentType) && filename.endsWith(".zip")) {
            return MAX_ZIP_SIZE_BYTES;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attachment chỉ hỗ trợ ảnh JPG/PNG/WebP hoặc file ZIP");
    }

    private String normalizeLinkUrl(String linkUrl) {
        if (linkUrl == null || linkUrl.isBlank()) {
            return null;
        }
        String value = linkUrl.trim();
        if (value.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đường dẫn attachment quá dài");
        }
        try {
            URI uri = new URI(value);
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))
                    || uri.getHost() == null || uri.getHost().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đường dẫn attachment phải là URL http/https hợp lệ");
            }
            return uri.toString();
        } catch (URISyntaxException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đường dẫn attachment không hợp lệ");
        }
    }

    private String resolveLinkTitle(String linkTitle, String linkUrl) {
        if (linkTitle != null && !linkTitle.isBlank()) {
            return normalizeAttachmentName(linkTitle);
        }
        return linkUrl.length() > 255 ? linkUrl.substring(0, 255) : linkUrl;
    }

    private String normalizeAttachmentName(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên attachment không được vượt quá 255 ký tự");
        }
        return normalized;
    }

    private String normalizeContentType(String contentType) {
        return contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
    }

    private TaskAttachmentVisibility resolveVisibility(String value, boolean leader, Task task) {
        TaskAttachmentVisibility visibility = parseVisibility(value);
        if (!leader && visibility != TaskAttachmentVisibility.TASK_ONLY) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ leader mới được chia sẻ attachment cho ban hoặc toàn sự kiện");
        }
        if (visibility == TaskAttachmentVisibility.DEPARTMENT && task.getDepartment() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attachment chia sẻ theo ban cần task có ban phụ trách");
        }
        return visibility;
    }

    private TaskAttachmentVisibility resolveUpdateVisibility(String value, boolean leader, TaskAttachment attachment) {
        if (value == null || value.isBlank()) {
            return resolveAttachmentVisibility(attachment);
        }
        return resolveVisibility(value, leader, attachment.getTask());
    }

    private TaskAttachmentVisibility parseVisibility(String value) {
        if (value == null || value.isBlank()) {
            return TaskAttachmentVisibility.TASK_ONLY;
        }
        try {
            return TaskAttachmentVisibility.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phạm vi hiển thị attachment không hợp lệ");
        }
    }

    private boolean canViewAttachment(TaskAttachment attachment, Long currentUserId) {
        if (currentUserId == null) {
            return false;
        }
        Task task = attachment.getTask();
        Long eventId = task.getEvent().getId();
        if (!eventMemberRepository.existsByEventIdAndUserId(eventId, currentUserId)) {
            return false;
        }
        if (isLeaderOfAttachmentEvent(attachment, currentUserId) || isUploader(attachment, currentUserId)) {
            return true;
        }

        return switch (resolveAttachmentVisibility(attachment)) {
            case TASK_ONLY -> task.getAssignee() != null && currentUserId.equals(task.getAssignee().getId());
            case DEPARTMENT -> task.getDepartment() != null
                    && eventMemberRepository.existsByEventIdAndUserIdAndDepartmentId(
                    eventId,
                    currentUserId,
                    task.getDepartment().getId());
            case EVENT_PUBLIC -> eventMemberRepository.existsByEventIdAndUserId(eventId, currentUserId);
        };
    }

    private boolean canEditAttachment(TaskAttachment attachment, Long currentUserId, boolean leader) {
        if (leader) {
            return true;
        }
        return isUploader(attachment, currentUserId)
                && eventMemberRepository.existsByEventIdAndUserId(
                attachment.getTask().getEvent().getId(),
                currentUserId);
    }

    private boolean isUploader(TaskAttachment attachment, Long currentUserId) {
        return currentUserId != null
                && attachment.getUploader() != null
                && currentUserId.equals(attachment.getUploader().getId());
    }

    private boolean isLeaderOfAttachmentEvent(TaskAttachment attachment, Long currentUserId) {
        return currentUserId != null
                && eventMemberRepository.existsByEventIdAndUserIdAndRole(
                attachment.getTask().getEvent().getId(),
                currentUserId,
                UserRole.LEADER);
    }

    private TaskAttachmentVisibility resolveAttachmentVisibility(TaskAttachment attachment) {
        return attachment.getVisibility() != null ? attachment.getVisibility() : TaskAttachmentVisibility.TASK_ONLY;
    }

    private boolean isLinkAttachment(TaskAttachment attachment) {
        return PROVIDER_LINK.equalsIgnoreCase(attachment.getStorageProvider());
    }

    private static Set<String> union(Set<String> first, Set<String> second) {
        Set<String> combined = new java.util.HashSet<>(first);
        combined.addAll(second);
        return Set.copyOf(combined);
    }

    public record TaskAttachmentDownload(
            org.springframework.core.io.Resource resource,
            String contentType,
            String originalName,
            long sizeBytes,
            Long eventId) {
    }
}
