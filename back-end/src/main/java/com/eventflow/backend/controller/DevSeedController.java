package com.eventflow.backend.controller;

import com.eventflow.backend.entity.*;
import com.eventflow.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@Profile("dev")
@ConditionalOnProperty(name = "eventflow.dev.seed-enabled", havingValue = "true")
@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
public class DevSeedController {

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final DepartmentRepository departmentRepository;
    private final TaskRepository taskRepository;
    private final EventMemberRepository eventMemberRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/seed")
    @Transactional
    public ResponseEntity<Map<String, Object>> seed() {

        User leader = userRepository.findByEmail("thang@eventflow.com")
                .orElseGet(() -> userRepository.save(User.builder()
                        .name("Anh Thang")
                        .email("thang@eventflow.com")
                        .password(passwordEncoder.encode("123456"))
                        .build()));

        User member = userRepository.findByEmail("member@eventflow.com")
                .orElseGet(() -> userRepository.save(User.builder()
                        .name("Nguyen Van A")
                        .email("member@eventflow.com")
                        .password(passwordEncoder.encode("123456"))
                        .build()));

        Event event = eventRepository.findFirstByNameOrderByIdAsc("Lễ Tốt Nghiệp K8 2026")
                .orElseGet(() -> eventRepository.save(Event.builder()
                        .name("Lễ Tốt Nghiệp K8 2026")
                        .eventDate(LocalDateTime.now().plusDays(14))
                        .status("ACTIVE")
                        .build()));

        ensureEventMember(event, leader, UserRole.LEADER);
        ensureEventMember(event, member, UserRole.MEMBER);

        Department deptTruyen = ensureDepartment(event, "Ban Truyền thông");
        Department deptHauCan = ensureDepartment(event, "Ban Hậu cần");

        createTaskIfMissing(event, deptTruyen, member, "Thiết kế banner sự kiện",
                TaskStatus.IN_PROGRESS, LocalDateTime.now().plusDays(3));
        createTaskIfMissing(event, deptTruyen, member, "Đăng bài Facebook",
                TaskStatus.TODO, LocalDateTime.now().plusDays(7));
        createTaskIfMissing(event, deptHauCan, leader, "Đặt thuê hội trường",
                TaskStatus.DONE, LocalDateTime.now().plusDays(1));
        createTaskIfMissing(event, deptHauCan, leader, "Chuẩn bị âm thanh ánh sáng",
                TaskStatus.TODO, LocalDateTime.now().minusDays(1));

        return ResponseEntity.ok(Map.of(
                "message", "Seed thành công",
                "eventId", event.getId(),
                "leaderId", leader.getId(),
                "leaderEmail", "thang@eventflow.com",
                "leaderPassword", "123456",
                "memberId", member.getId(),
                "memberEmail", "member@eventflow.com",
                "memberPassword", "123456"
        ));
    }

    private EventMember ensureEventMember(Event event, User user, UserRole role) {
        return eventMemberRepository.findByEventIdAndUserId(event.getId(), user.getId())
                .map(existing -> {
                    if (existing.getRole() != role) {
                        existing.setRole(role);
                        return eventMemberRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> eventMemberRepository.save(EventMember.builder()
                        .event(event)
                        .user(user)
                        .role(role)
                        .build()));
    }

    private Department ensureDepartment(Event event, String name) {
        return departmentRepository.findByEventIdAndName(event.getId(), name)
                .orElseGet(() -> departmentRepository.save(Department.builder()
                        .event(event)
                        .name(name)
                        .build()));
    }

    private void createTaskIfMissing(
            Event event,
            Department department,
            User assignee,
            String title,
            TaskStatus status,
            LocalDateTime deadline) {

        if (taskRepository.existsByEventIdAndTitle(event.getId(), title)) {
            return;
        }

        taskRepository.save(Task.builder()
                .event(event)
                .department(department)
                .assignee(assignee)
                .title(title)
                .status(status)
                .deadline(deadline)
                .build());
    }
}
