package com.eventflow.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "task_reports")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Column(name = "progress_percentage", nullable = false)
    private Integer progressPercentage;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_original_name")
    private String imageOriginalName;

    @Column(name = "image_content_type", length = 100)
    private String imageContentType;

    @Column(name = "image_size_bytes")
    private Long imageSizeBytes;

    @Column(name = "image_storage_provider", length = 50)
    private String imageStorageProvider;

    @Column(name = "image_storage_path", length = 500)
    private String imageStoragePath;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    void markUpdated() {
        updatedAt = LocalDateTime.now();
    }
}
