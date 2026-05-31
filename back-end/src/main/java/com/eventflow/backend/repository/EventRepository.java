package com.eventflow.backend.repository;

import com.eventflow.backend.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    Optional<Event> findFirstByNameOrderByIdAsc(String name);
}
