package com.eventflow.backend.repository;

import com.eventflow.backend.entity.CheckInRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CheckInRecordRepository extends JpaRepository<CheckInRecord, Long> {
    List<CheckInRecord> findAllByEventIdOrderByCheckedInAtDesc(Long eventId);
}
