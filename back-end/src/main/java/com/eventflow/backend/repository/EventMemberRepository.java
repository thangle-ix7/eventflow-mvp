package com.eventflow.backend.repository;

import com.eventflow.backend.entity.EventMember;
import com.eventflow.backend.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventMemberRepository extends JpaRepository<EventMember, Long> {

    List<EventMember> findByEventIdAndRole(Long eventId, UserRole role);

    // Efficient count query to check role membership without lazy-loading User entity
    @Query("SELECT COUNT(em) > 0 FROM EventMember em WHERE em.event.id = :eventId AND em.user.id = :userId AND em.role = :role")
    boolean existsByEventIdAndUserIdAndRole(
            @Param("eventId") Long eventId,
            @Param("userId") Long userId,
            @Param("role") UserRole role);
}
