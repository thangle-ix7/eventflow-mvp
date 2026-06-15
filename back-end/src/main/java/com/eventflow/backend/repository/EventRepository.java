package com.eventflow.backend.repository;

import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.EventNature;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    Optional<Event> findFirstByNameOrderByIdAsc(String name);

    @Query("""
            SELECT e FROM Event e
            WHERE e.nature = :nature
            AND (:search IS NULL OR :search = '' OR LOWER(e.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<Event> findAllByNature(
            @Param("nature") EventNature nature,
            @Param("search") String search,
            Pageable pageable);
}
