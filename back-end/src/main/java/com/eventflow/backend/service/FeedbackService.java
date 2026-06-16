package com.eventflow.backend.service;

import com.eventflow.backend.dto.FeedbackAdminResponseRequest;
import com.eventflow.backend.dto.FeedbackRequestDTO;
import com.eventflow.backend.dto.FeedbackResponseDTO;
import com.eventflow.backend.entity.*;
import com.eventflow.backend.repository.EventRepository;
import com.eventflow.backend.repository.FeedbackSubmissionRepository;
import com.eventflow.backend.repository.NotificationRepository;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackSubmissionRepository feedbackRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final NotificationRepository notificationRepository;

    @Transactional
    public FeedbackResponseDTO submitFeedback(Long userId, FeedbackRequestDTO request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng không hợp lệ"));

        Event event = null;
        if (request.getEventId() != null) {
            event = eventRepository.findById(request.getEventId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sự kiện"));
        }

        FeedbackSubmission feedback = feedbackRepository.save(FeedbackSubmission.builder()
                .user(user)
                .event(event)
                .category(normalizeCategory(request.getCategory()))
                .message(request.getMessage().trim())
                .anonymous(Boolean.TRUE.equals(request.getAnonymous()))
                .publicVisible(Boolean.TRUE.equals(request.getPublicVisible()))
                .contactEmail(normalizeOptionalText(request.getContactEmail()))
                .status(FeedbackStatus.OPEN)
                .build());

        return mapToResponse(feedback);
    }

    @Transactional(readOnly = true)
    public Page<FeedbackResponseDTO> getFeedbackForAdmin(FeedbackStatus status, Long eventId, int page, int size) {
        var pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        return feedbackRepository.findForAdmin(status, eventId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional
    public FeedbackResponseDTO respondToFeedback(Long feedbackId, Long responderId, FeedbackAdminResponseRequest request) {
        FeedbackSubmission feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy feedback"));

        User responder = userRepository.findById(responderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng không hợp lệ"));

        FeedbackStatus previousStatus = feedback.getStatus();
        FeedbackStatus nextStatus = request.getStatus() != null ? request.getStatus() : FeedbackStatus.RESPONDED;

        feedback.setStatus(nextStatus);
        feedback.setResponseMessage(normalizeOptionalText(request.getResponseMessage()));
        feedback.setRespondedBy(responder);
        feedback.setRespondedAt(LocalDateTime.now());

        FeedbackSubmission saved = feedbackRepository.save(feedback);
        notifyFeedbackStatusChanged(saved, previousStatus, nextStatus);

        return mapToResponse(saved);
    }

    private String normalizeCategory(String category) {
        String normalized = normalizeOptionalText(category);
        return normalized != null ? normalized.toUpperCase() : "GENERAL";
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private FeedbackResponseDTO mapToResponse(FeedbackSubmission feedback) {
        User user = feedback.getUser();
        Event event = feedback.getEvent();
        User respondedBy = feedback.getRespondedBy();
        boolean anonymous = Boolean.TRUE.equals(feedback.getAnonymous());

        return FeedbackResponseDTO.builder()
                .id(feedback.getId())
                .eventId(event != null ? event.getId() : null)
                .eventName(event != null ? event.getName() : null)
                .category(feedback.getCategory())
                .message(feedback.getMessage())
                .anonymous(anonymous)
                .publicVisible(feedback.getPublicVisible())
                .contactEmail(feedback.getContactEmail())
                .userId(!anonymous && user != null ? user.getId() : null)
                .userName(!anonymous && user != null ? user.getName() : null)
                .status(feedback.getStatus())
                .responseMessage(feedback.getResponseMessage())
                .respondedByName(respondedBy != null ? respondedBy.getName() : null)
                .respondedAt(feedback.getRespondedAt())
                .createdAt(feedback.getCreatedAt())
                .build();
    }

    private void notifyFeedbackStatusChanged(FeedbackSubmission feedback, FeedbackStatus previousStatus, FeedbackStatus nextStatus) {
        if (previousStatus == nextStatus || nextStatus == FeedbackStatus.OPEN || feedback.getUser() == null) {
            return;
        }

        User user = feedback.getUser();
        NotiType type = switch (nextStatus) {
            case REVIEWING -> NotiType.FEEDBACK_REVIEWING;
            case RESPONDED -> NotiType.FEEDBACK_RESPONDED;
            case CLOSED -> NotiType.FEEDBACK_CLOSED;
            default -> null;
        };

        if (type == null) {
            return;
        }

        notificationRepository.insertWorkflowNotification(
                user.getId(),
                null,
                feedback.getEvent() != null ? feedback.getEvent().getId() : null,
                null,
                resolveChannel(user).name(),
                type.name(),
                NotiStatus.PENDING.name(),
                feedbackNotificationTitle(nextStatus),
                feedbackNotificationMessage(feedback, nextStatus));
    }

    private NotiChannel resolveChannel(User user) {
        return user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank()
                ? NotiChannel.TELEGRAM
                : NotiChannel.EMAIL;
    }

    private String feedbackNotificationTitle(FeedbackStatus status) {
        return switch (status) {
            case REVIEWING -> "EventFlow đang xem feedback của bạn";
            case RESPONDED -> "EventFlow đã phản hồi feedback của bạn";
            case CLOSED -> "Feedback của bạn đã được đóng";
            default -> "Feedback của bạn có cập nhật";
        };
    }

    private String feedbackNotificationMessage(FeedbackSubmission feedback, FeedbackStatus status) {
        String category = feedback.getCategory() != null ? feedback.getCategory() : "GENERAL";
        String eventName = feedback.getEvent() != null ? feedback.getEvent().getName() : null;
        String eventLine = eventName != null && !eventName.isBlank()
                ? "\nEvent: " + eventName
                : "";
        String response = feedback.getResponseMessage() != null && !feedback.getResponseMessage().isBlank()
                ? "\n\nPhản hồi từ team:\n" + feedback.getResponseMessage()
                : "";

        return switch (status) {
            case REVIEWING -> "Team EventFlow đã nhận và đang xem feedback của bạn."
                    + eventLine
                    + "\nLoại feedback: " + category
                    + "\n\nCảm ơn bạn đã đồng sáng tạo sản phẩm cùng tụi mình.";
            case RESPONDED -> "Team EventFlow đã phản hồi feedback của bạn."
                    + eventLine
                    + "\nLoại feedback: " + category
                    + response;
            case CLOSED -> "Feedback của bạn đã được xử lý và đóng lại."
                    + eventLine
                    + "\nLoại feedback: " + category
                    + response;
            default -> "Feedback của bạn có cập nhật mới.";
        };
    }
}
