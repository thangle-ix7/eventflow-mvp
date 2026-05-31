package com.eventflow.backend.repository;

import com.eventflow.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.telegramChatId = :chatId WHERE u.id = :userId")
    int updateTelegramChatId(@Param("userId") Long userId, @Param("chatId") String chatId);

    Optional<User> findByTelegramLinkTokenHashAndTelegramLinkTokenExpiresAtAfter(
            String tokenHash,
            LocalDateTime now);
}
