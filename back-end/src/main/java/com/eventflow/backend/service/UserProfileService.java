package com.eventflow.backend.service;

import com.eventflow.backend.dto.PageResponse;
import com.eventflow.backend.dto.UserDataExportResponse;
import com.eventflow.backend.dto.UserProfileDTO;
import com.eventflow.backend.dto.UserProfileUpdateRequest;
import com.eventflow.backend.dto.UserPreferencesRequest;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.RefreshTokenRepository;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private static final long MAX_AVATAR_SIZE_BYTES = 2L * 1024L * 1024L;
    private static final Set<String> ALLOWED_AVATAR_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp");

    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;
    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional(readOnly = true)
    public UserProfileDTO getProfile(Long userId) {
        return mapToProfile(findUser(userId));
    }

    @Transactional(readOnly = true)
    public PageResponse<UserProfileDTO> getUsersForAdmin(
            int page,
            int size,
            String sort,
            String direction,
            String search) {

        var pageable = PageRequest.of(
                normalizePage(page),
                normalizeSize(size),
                Sort.by(resolveDirection(direction), resolveSort(sort)));

        return PageResponse.from(userRepository.findAllForAdmin(normalizeSearch(search), pageable)
                .map(this::mapToProfile));
    }

    @Transactional(readOnly = true)
    public UserProfileDTO getUserForAdmin(Long userId) {
        return mapToProfile(findUser(userId));
    }

    @Transactional
    public UserProfileDTO updateProfile(Long userId, UserProfileUpdateRequest request) {
        User user = findUser(userId);
        user.setName(request.getName().trim());
        String phoneNumber = request.getPhoneNumber();
        user.setPhoneNumber(phoneNumber != null && !phoneNumber.isBlank() ? phoneNumber.trim() : null);

        return mapToProfile(userRepository.save(user));
    }

    @Transactional
    public UserProfileDTO updatePreferences(Long userId, UserPreferencesRequest request) {
        User user = findUser(userId);
        if (request.getTaskPageSize() != null) {
            user.setTaskPageSize(request.getTaskPageSize());
        }

        return mapToProfile(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public UserDataExportResponse exportPersonalData(Long userId) {
        User user = findUser(userId);
        UserProfileDTO profile = mapToProfile(user);
        var consent = new UserDataExportResponse.ConsentSnapshot(
                user.getConsentVersion(),
                user.getConsentAcceptedAt(),
                user.getPersonalDataDeletedAt());
        List<UserDataExportResponse.EventMembershipSnapshot> eventMemberships = jdbcTemplate.query("""
                        SELECT e.id AS event_id,
                               e.name AS event_name,
                               em.role,
                               em.joined_at
                        FROM event_members em
                        JOIN events e ON e.id = em.event_id
                        WHERE em.user_id = ?
                        ORDER BY em.joined_at DESC, e.id DESC
                        """,
                (rs, rowNum) -> new UserDataExportResponse.EventMembershipSnapshot(
                        rs.getLong("event_id"),
                        rs.getString("event_name"),
                        rs.getString("role"),
                        rs.getTimestamp("joined_at") != null ? rs.getTimestamp("joined_at").toLocalDateTime() : null),
                userId);
        List<UserDataExportResponse.PaymentSnapshot> payments = jdbcTemplate.query("""
                        SELECT pt.id,
                               pt.provider,
                               pt.provider_order_id,
                               pt.plan_code,
                               pt.amount_vnd,
                               pt.status,
                               pt.created_at,
                               pt.paid_at
                        FROM payment_transactions pt
                        WHERE pt.user_id = ?
                        ORDER BY pt.created_at DESC, pt.id DESC
                        """,
                (rs, rowNum) -> new UserDataExportResponse.PaymentSnapshot(
                        rs.getLong("id"),
                        rs.getString("provider"),
                        rs.getString("provider_order_id"),
                        rs.getString("plan_code"),
                        rs.getLong("amount_vnd"),
                        rs.getString("status"),
                        rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null,
                        rs.getTimestamp("paid_at") != null ? rs.getTimestamp("paid_at").toLocalDateTime() : null),
                userId);

        return new UserDataExportResponse(LocalDateTime.now(), profile, consent, eventMemberships, payments);
    }

    @Transactional
    public void erasePersonalData(Long userId) {
        User user = findUser(userId);
        if (user.getPersonalDataDeletedAt() != null) {
            return;
        }

        StoredFile oldAvatar = currentAvatar(user);
        user.setName("Deleted user " + userId);
        user.setEmail("deleted-user-" + userId + "@eventflow.local");
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setPhoneNumber(null);
        user.setTelegramChatId(null);
        user.setTelegramLinkTokenHash(null);
        user.setTelegramLinkTokenExpiresAt(null);
        user.setEmailVerificationTokenHash(null);
        user.setEmailVerificationTokenExpiresAt(null);
        user.setPasswordResetTokenHash(null);
        user.setPasswordResetTokenExpiresAt(null);
        user.setAvatarOriginalName(null);
        user.setAvatarContentType(null);
        user.setAvatarSizeBytes(null);
        user.setAvatarStorageProvider(null);
        user.setAvatarStoragePath(null);
        user.setConsentVersion(null);
        user.setConsentAcceptedAt(null);
        user.setPersonalDataDeletedAt(LocalDateTime.now());
        userRepository.save(user);
        refreshTokenRepository.deleteByUserId(userId);

        if (oldAvatar != null) {
            fileStorageService.delete(oldAvatar.storageProvider(), oldAvatar.storagePath());
        }
    }

    @Transactional
    public UserProfileDTO uploadAvatar(Long userId, MultipartFile avatar) {
        User user = findUser(userId);
        StoredFile oldAvatar = currentAvatar(user);
        StoredFile storedAvatar = fileStorageService.store(
                avatar,
                "profile/" + userId,
                MAX_AVATAR_SIZE_BYTES,
                ALLOWED_AVATAR_TYPES);

        user.setAvatarOriginalName(storedAvatar.originalName());
        user.setAvatarContentType(storedAvatar.contentType());
        user.setAvatarSizeBytes(storedAvatar.sizeBytes());
        user.setAvatarStorageProvider(storedAvatar.storageProvider());
        user.setAvatarStoragePath(storedAvatar.storagePath());

        User saved = userRepository.save(user);
        if (oldAvatar != null) {
            fileStorageService.delete(oldAvatar.storageProvider(), oldAvatar.storagePath());
        }

        return mapToProfile(saved);
    }

    @Transactional(readOnly = true)
    public AvatarDownload getAvatar(Long userId) {
        User user = findUser(userId);
        if (user.getAvatarStoragePath() == null || user.getAvatarStoragePath().isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Người dùng chưa upload ảnh đại diện");
        }

        var content = fileStorageService.load(
                user.getAvatarStorageProvider(),
                user.getAvatarStoragePath(),
                user.getAvatarContentType(),
                user.getAvatarOriginalName(),
                user.getAvatarSizeBytes() != null ? user.getAvatarSizeBytes() : 0L);

        return new AvatarDownload(
                content.resource(),
                content.contentType(),
                content.originalName(),
                content.sizeBytes());
    }

    public String avatarUrl(Long userId, String storagePath) {
        if (storagePath == null || storagePath.isBlank()) {
            return null;
        }
        return "/api/v1/users/" + userId + "/avatar";
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
    }

    private StoredFile currentAvatar(User user) {
        if (user.getAvatarStoragePath() == null || user.getAvatarStoragePath().isBlank()) {
            return null;
        }
        return new StoredFile(
                user.getAvatarOriginalName(),
                user.getAvatarContentType(),
                user.getAvatarSizeBytes() != null ? user.getAvatarSizeBytes() : 0L,
                user.getAvatarStorageProvider(),
                user.getAvatarStoragePath());
    }

    private int normalizePage(int page) {
        return Math.max(page, 0);
    }

    private int normalizeSize(int size) {
        return Math.min(Math.max(size, 1), 100);
    }

    private String normalizeSearch(String search) {
        return search == null ? "" : search.trim();
    }

    private Sort.Direction resolveDirection(String direction) {
        return "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
    }

    private String resolveSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return "createdAt";
        }

        return switch (sort) {
            case "name", "email", "createdAt", "systemRole" -> sort;
            default -> "createdAt";
        };
    }

    private UserProfileDTO mapToProfile(User user) {
        return new UserProfileDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.isEmailVerified(),
                user.getTelegramChatId(),
                avatarUrl(user.getId(), user.getAvatarStoragePath()),
                user.getTaskPageSize() != null ? user.getTaskPageSize() : 10,
                user.getCreatedAt(),
                user.getSystemRole() != null ? user.getSystemRole().name() : "USER");
    }

    public record AvatarDownload(
            org.springframework.core.io.Resource resource,
            String contentType,
            String originalName,
            long sizeBytes) {
    }
}

