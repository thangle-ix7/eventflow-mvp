package com.eventflow.backend.repository;

import com.eventflow.backend.entity.EventMember;
import com.eventflow.backend.entity.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventMemberRepository extends JpaRepository<EventMember, Long> {

    List<EventMember> findByEventIdAndRole(Long eventId, UserRole role);

    Optional<EventMember> findByEventIdAndUserId(Long eventId, Long userId);

    @Query("SELECT em FROM EventMember em JOIN FETCH em.event WHERE em.user.id = :userId ORDER BY em.event.eventDate ASC")
    List<EventMember> findAllByUserIdWithEvent(@Param("userId") Long userId);

    @Query("SELECT em FROM EventMember em JOIN FETCH em.user WHERE em.event.id = :eventId ORDER BY em.role ASC, em.user.name ASC")
    List<EventMember> findAllByEventIdWithUser(@Param("eventId") Long eventId);

    @Query("""
            SELECT em FROM EventMember em
            JOIN FETCH em.user
            LEFT JOIN FETCH em.department
            WHERE em.event.id = :eventId
            AND em.department.id = :departmentId
            ORDER BY em.role ASC, em.user.name ASC
            """)
    List<EventMember> findAllByEventIdAndDepartmentIdWithUser(
            @Param("eventId") Long eventId,
            @Param("departmentId") Long departmentId);

    @Query(value = """
            SELECT em FROM EventMember em
            JOIN FETCH em.event e
            WHERE em.user.id = :userId
            AND (:status IS NULL OR e.status = :status)
            AND (:search = '' OR LOWER(e.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """,
            countQuery = """
            SELECT COUNT(em) FROM EventMember em
            JOIN em.event e
            WHERE em.user.id = :userId
            AND (:status IS NULL OR e.status = :status)
            AND (:search = '' OR LOWER(e.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<EventMember> findAllByUserIdWithEvent(
            @Param("userId") Long userId,
            @Param("status") String status,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT em FROM EventMember em JOIN FETCH em.event WHERE em.event.id = :eventId AND em.user.id = :userId")
    Optional<EventMember> findByEventIdAndUserIdWithEvent(
            @Param("eventId") Long eventId,
            @Param("userId") Long userId);

    boolean existsByEventIdAndUserId(Long eventId, Long userId);

    // Efficient count query to check role membership without lazy-loading User entity
    @Query("SELECT COUNT(em) > 0 FROM EventMember em WHERE em.event.id = :eventId AND em.user.id = :userId AND em.role = :role")
    boolean existsByEventIdAndUserIdAndRole(
            @Param("eventId") Long eventId,
            @Param("userId") Long userId,
            @Param("role") UserRole role);
}
