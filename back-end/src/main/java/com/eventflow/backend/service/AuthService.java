package com.eventflow.backend.service;

import com.eventflow.backend.dto.AuthResponse;
import com.eventflow.backend.dto.AuthMessageResponse;
import com.eventflow.backend.dto.EmailRequest;
import com.eventflow.backend.dto.LoginRequest;
import com.eventflow.backend.dto.ResetPasswordRequest;
import com.eventflow.backend.dto.SignupRequest;
import com.eventflow.backend.dto.TokenRequest;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.UserRepository;
import com.eventflow.backend.util.JwtUtil;
import com.eventflow.backend.util.SecureTokenUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthEmailService authEmailService;
    private final UserProfileService userProfileService;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Value("${eventflow.auth.email-verification-token-ttl-minutes}")
    private long emailVerificationTokenTtlMinutes;

    @Value("${eventflow.auth.password-reset-token-ttl-minutes}")
    private long passwordResetTokenTtlMinutes;

    @Value("${eventflow.auth.max-failed-login-attempts}")
    private int maxFailedLoginAttempts;

    @Value("${eventflow.auth.lockout-minutes}")
    private long lockoutMinutes;

    @Transactional
    public AuthMessageResponse signup(SignupRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được sử dụng");
        }

        User user = User.builder()
                .name(request.getName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .emailVerified(false)
                .build();

        User saved = userRepository.save(user);
        createAndSendVerificationToken(saved);

        return new AuthMessageResponse("Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.");
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.getEmail()))
                .orElseThrow(this::invalidCredentials);

        LocalDateTime now = LocalDateTime.now();
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) {
            throw new ResponseStatusException(
                    HttpStatus.LOCKED,
                    "Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            registerFailedLogin(user);
            throw invalidCredentials();
        }

        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Vui lòng xác thực email trước khi đăng nhập");
        }

        if (user.getFailedLoginAttempts() != 0 || user.getLockedUntil() != null) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            userRepository.save(user);
        }

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse verifyEmail(TokenRequest request) {
        User user = userRepository.findByEmailVerificationTokenHashAndEmailVerificationTokenExpiresAtAfter(
                        SecureTokenUtil.sha256Hex(request.getToken().trim()),
                        LocalDateTime.now())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token xác thực email không hợp lệ hoặc đã hết hạn"));

        user.setEmailVerified(true);
        user.setEmailVerificationTokenHash(null);
        user.setEmailVerificationTokenExpiresAt(null);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthMessageResponse resendVerificationEmail(EmailRequest request) {
        userRepository.findByEmail(normalizeEmail(request.getEmail()))
                .filter(user -> !user.isEmailVerified())
                .ifPresent(this::createAndSendVerificationToken);

        return new AuthMessageResponse("Nếu email tồn tại và chưa xác thực, hệ thống sẽ gửi lại link xác thực.");
    }

    @Transactional
    public AuthMessageResponse forgotPassword(EmailRequest request) {
        userRepository.findByEmail(normalizeEmail(request.getEmail()))
                .filter(User::isEmailVerified)
                .ifPresent(this::createAndSendPasswordResetToken);

        return new AuthMessageResponse("Nếu email tồn tại, hệ thống sẽ gửi link đặt lại mật khẩu.");
    }

    @Transactional
    public AuthMessageResponse resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByPasswordResetTokenHashAndPasswordResetTokenExpiresAtAfter(
                        SecureTokenUtil.sha256Hex(request.getToken().trim()),
                        LocalDateTime.now())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetTokenHash(null);
        user.setPasswordResetTokenExpiresAt(null);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        return new AuthMessageResponse("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.");
    }

    private void createAndSendVerificationToken(User user) {
        String token = SecureTokenUtil.generateToken();
        user.setEmailVerificationTokenHash(SecureTokenUtil.sha256Hex(token));
        user.setEmailVerificationTokenExpiresAt(LocalDateTime.now().plusMinutes(emailVerificationTokenTtlMinutes));
        userRepository.save(user);
        authEmailService.sendVerificationEmail(user.getEmail(), token);
    }

    private void createAndSendPasswordResetToken(User user) {
        String token = SecureTokenUtil.generateToken();
        user.setPasswordResetTokenHash(SecureTokenUtil.sha256Hex(token));
        user.setPasswordResetTokenExpiresAt(LocalDateTime.now().plusMinutes(passwordResetTokenTtlMinutes));
        userRepository.save(user);
        authEmailService.sendPasswordResetEmail(user.getEmail(), token);
    }

    private void registerFailedLogin(User user) {
        int failedAttempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(failedAttempts);
        if (failedAttempts >= maxFailedLoginAttempts) {
            user.setLockedUntil(LocalDateTime.now().plusMinutes(lockoutMinutes));
        }
        userRepository.save(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String token = JwtUtil.generateToken(user.getId(), jwtSecret, jwtExpirationMs);
        return new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail(),
                userProfileService.avatarUrl(user.getId(), user.getAvatarStoragePath()),
                user.getTaskPageSize() != null ? user.getTaskPageSize() : 10,
                user.getSystemRole() != null ? user.getSystemRole().name() : "USER");
    }

    private ResponseStatusException invalidCredentials() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng");
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }
}
