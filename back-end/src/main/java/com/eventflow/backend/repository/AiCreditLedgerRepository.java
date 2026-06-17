package com.eventflow.backend.repository;

import com.eventflow.backend.entity.AiCreditLedger;
import com.eventflow.backend.entity.AiCreditSourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface AiCreditLedgerRepository extends JpaRepository<AiCreditLedger, Long> {

    @Query("""
            SELECT COALESCE(SUM(ledger.creditsDelta), 0)
            FROM AiCreditLedger ledger
            WHERE ledger.user.id = :userId
              AND ledger.sourceType = :sourceType
              AND ledger.createdAt >= :periodStart
              AND ledger.createdAt < :periodEnd
            """)
    int sumUserCreditsInPeriod(
            @Param("userId") Long userId,
            @Param("sourceType") AiCreditSourceType sourceType,
            @Param("periodStart") LocalDateTime periodStart,
            @Param("periodEnd") LocalDateTime periodEnd);

    @Query("""
            SELECT COALESCE(SUM(ledger.creditsDelta), 0)
            FROM AiCreditLedger ledger
            WHERE ledger.eventPass.id = :eventPassId
            """)
    int sumEventPassCredits(@Param("eventPassId") Long eventPassId);
}
