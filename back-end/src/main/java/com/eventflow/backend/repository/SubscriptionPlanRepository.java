package com.eventflow.backend.repository;

import com.eventflow.backend.entity.PlanType;
import com.eventflow.backend.entity.SubscriptionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, String> {
    List<SubscriptionPlan> findAllByOrderByPriorityRankAsc();

    List<SubscriptionPlan> findAllByPlanTypeOrderByPriorityRankAsc(PlanType planType);
}
