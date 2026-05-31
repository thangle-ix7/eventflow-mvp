package com.eventflow.backend.repository;

import com.eventflow.backend.entity.Department;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {
    List<Department> findAllByEventIdOrderByNameAsc(Long eventId);

    Page<Department> findAllByEventIdAndNameContainingIgnoreCase(Long eventId, String name, Pageable pageable);

    Optional<Department> findByIdAndEventId(Long departmentId, Long eventId);

    Optional<Department> findByEventIdAndName(Long eventId, String name);

    boolean existsByEventIdAndName(Long eventId, String name);

    boolean existsByIdAndEventId(Long departmentId, Long eventId);

    boolean existsByEventIdAndNameAndIdNot(Long eventId, String name, Long departmentId);
}
