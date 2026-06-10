package com.eventflow.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 255)
    private String location;

    @Column(name = "event_date", nullable = false)
    private LocalDateTime eventDate;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EventNature nature = EventNature.NORMAL;

    @Column(length = 50)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "context_description", columnDefinition = "TEXT")
    private String contextDescription;

    @Column(columnDefinition = "TEXT")
    private String objective;

    @Column(name = "expected_attendees")
    private Integer expectedAttendees;

    @Column(length = 100)
    private String scale;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
