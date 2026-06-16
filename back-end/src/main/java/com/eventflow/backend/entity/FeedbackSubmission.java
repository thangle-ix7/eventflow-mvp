package com.eventflow.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_submissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;

    @Column(length = 50, nullable = false)
    private String category;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "is_anonymous", nullable = false)
    @Builder.Default
    private Boolean anonymous = false;

    @Column(name = "public_visible", nullable = false)
    @Builder.Default
    private Boolean publicVisible = false;

    @Column(name = "contact_email", length = 100)
    private String contactEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private FeedbackStatus status = FeedbackStatus.OPEN;

    @Column(name = "response_message", columnDefinition = "TEXT")
    private String responseMessage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responded_by_user_id")
    private User respondedBy;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
