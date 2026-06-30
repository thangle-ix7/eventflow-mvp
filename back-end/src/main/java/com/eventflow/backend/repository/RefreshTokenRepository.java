package com.eventflow.backend.repository;

import com.eventflow.backend.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
            String tokenHash,
            LocalDateTime now);
}
