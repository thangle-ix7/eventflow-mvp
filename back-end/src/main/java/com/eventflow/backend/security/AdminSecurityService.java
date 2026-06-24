package com.eventflow.backend.security;

import com.eventflow.backend.entity.SystemRole;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminSecurityService {

    private final UserRepository userRepository;

    /**
     * Kiểm tra user có phải ADMIN không
     */
    public boolean isAdmin(Long userId) {
        return userRepository.findById(userId)
                .map(user -> user.getSystemRole() == SystemRole.ADMIN)
                .orElse(false);
    }

    /**
     * Kiểm tra user có quyền quản lý templates không
     * (Hiện tại chỉ ADMIN, có thể mở rộng sau)
     */
    public boolean canManageTemplates(Long userId) {
        return isAdmin(userId);
    }

    public boolean canManageDiscountCodes(Long userId) {
        return isAdmin(userId);
    }

    public boolean canViewUsers(Long userId) {
        return isAdmin(userId);
    }

    public boolean canSendUserEmails(Long userId) {
        return isAdmin(userId);
    }
}
