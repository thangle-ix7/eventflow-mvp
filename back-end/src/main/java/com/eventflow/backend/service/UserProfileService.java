package com.eventflow.backend.service;

import com.eventflow.backend.dto.UserProfileDTO;
import com.eventflow.backend.dto.UserProfileUpdateRequest;
import com.eventflow.backend.dto.UserPreferencesRequest;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

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

    @Transactional(readOnly = true)
    public UserProfileDTO getProfile(Long userId) {
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
