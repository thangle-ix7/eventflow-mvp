package com.eventflow.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "task_reviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskReview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_before", nullable = false, length = 50)
    private TaskStatus statusBefore;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_after", nullable = false, length = 50)
    private TaskStatus statusAfter;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "reviewed_at", nullable = false)
    @Builder.Default
    private LocalDateTime reviewedAt = LocalDateTime.now();
}
