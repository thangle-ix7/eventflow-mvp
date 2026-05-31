package com.eventflow.backend.controller;

import com.eventflow.backend.entity.*;
import com.eventflow.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

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
    public ResponseEntity<Map<String, Object>> seed() {

        // Xóa data cũ theo thứ tự FK
        taskRepository.deleteAll();
        eventMemberRepository.deleteAll();
        departmentRepository.deleteAll();
        eventRepository.deleteAll();
        userRepository.deleteAll();

        // Tạo user LEADER
        User leader = userRepository.save(User.builder()
                .name("Anh Thang")
                .email("thang@eventflow.com")
                .password(passwordEncoder.encode("123456"))
                .build());

        // Tạo user MEMBER
        User member = userRepository.save(User.builder()
                .name("Nguyen Van A")
                .email("member@eventflow.com")
                .password(passwordEncoder.encode("123456"))
                .build());

        // Tạo event
        Event event = eventRepository.save(Event.builder()
                .name("Lễ Tốt Nghiệp K8 2026")
                .eventDate(LocalDateTime.now().plusDays(14))
                .status("ACTIVE")
                .build());

        // Thêm members vào event
        eventMemberRepository.save(EventMember.builder()
                .event(event)
                .user(leader)
                .role(UserRole.LEADER)
                .build());

        eventMemberRepository.save(EventMember.builder()
                .event(event)
                .user(member)
                .role(UserRole.MEMBER)
                .build());

        // Tạo departments
        Department deptTruyen = departmentRepository.save(Department.builder()
                .event(event)
                .name("Ban Truyền thông")
                .build());

        Department deptHauCan = departmentRepository.save(Department.builder()
                .event(event)
                .name("Ban Hậu cần")
                .build());

        // Tạo tasks (1 overdue để test dashboard)
        taskRepository.save(Task.builder()
                .event(event)
                .department(deptTruyen)
                .assignee(member)
                .title("Thiết kế banner sự kiện")
                .status(TaskStatus.IN_PROGRESS)
                .deadline(LocalDateTime.now().plusDays(3))
                .build());

        taskRepository.save(Task.builder()
                .event(event)
                .department(deptTruyen)
                .assignee(member)
                .title("Đăng bài Facebook")
                .status(TaskStatus.TODO)
                .deadline(LocalDateTime.now().plusDays(7))
                .build());

        taskRepository.save(Task.builder()
                .event(event)
                .department(deptHauCan)
                .assignee(leader)
                .title("Đặt thuê hội trường")
                .status(TaskStatus.DONE)
                .deadline(LocalDateTime.now().plusDays(1))
                .build());

        taskRepository.save(Task.builder()
                .event(event)
                .department(deptHauCan)
                .assignee(leader)
                .title("Chuẩn bị âm thanh ánh sáng")
                .status(TaskStatus.TODO)
                .deadline(LocalDateTime.now().minusDays(1))
                .build());

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
}