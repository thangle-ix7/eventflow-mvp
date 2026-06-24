package com.eventflow.backend.repository;

import com.eventflow.backend.entity.SystemRole;
import com.eventflow.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    long countBySystemRole(SystemRole systemRole);

    @Query("""
            SELECT u
            FROM User u
            WHERE LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
            """)
    Page<User> findAllForAdmin(@Param("search") String search, Pageable pageable);

    @Query("""
            SELECT u
            FROM User u
            WHERE u.id IN :ids
            ORDER BY u.name ASC, u.id ASC
            """)
    List<User> findAllByIdInForAdminEmail(@Param("ids") Collection<Long> ids);

    @Query("""
            SELECT u
            FROM User u
            WHERE LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
            ORDER BY u.createdAt DESC, u.id DESC
            """)
    List<User> findAllForAdminEmail(@Param("search") String search);

    Optional<User> findByEmailVerificationTokenHashAndEmailVerificationTokenExpiresAtAfter(
            String tokenHash,
            LocalDateTime now);

    Optional<User> findByPasswordResetTokenHashAndPasswordResetTokenExpiresAtAfter(
            String tokenHash,
            LocalDateTime now);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.telegramChatId = :chatId WHERE u.id = :userId")
    int updateTelegramChatId(@Param("userId") Long userId, @Param("chatId") String chatId);

    Optional<User> findByTelegramLinkTokenHashAndTelegramLinkTokenExpiresAtAfter(
            String tokenHash,
            LocalDateTime now);
}




