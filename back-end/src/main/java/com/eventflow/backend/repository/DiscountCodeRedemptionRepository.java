package com.eventflow.backend.repository;

import com.eventflow.backend.entity.DiscountCodeRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DiscountCodeRedemptionRepository extends JpaRepository<DiscountCodeRedemption, Long> {
}
