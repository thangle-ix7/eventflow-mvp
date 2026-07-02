package com.eventflow.backend.controller;

import com.eventflow.backend.dto.AuthMessageResponse;
import com.eventflow.backend.dto.AuthResponse;
import com.eventflow.backend.dto.EmailRequest;
import com.eventflow.backend.dto.LoginRequest;
import com.eventflow.backend.dto.ResetPasswordRequest;
import com.eventflow.backend.dto.SignupRequest;
import com.eventflow.backend.dto.TokenRequest;
import com.eventflow.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/api/auth", "/api/v1/auth"})
@RequiredArgsConstructor
public class AuthController {

    private static final String ACCESS_COOKIE_NAME = "EVENTFLOW_ACCESS_TOKEN";
    private static final String REFRESH_COOKIE_NAME = "EVENTFLOW_REFRESH_TOKEN";

    private final AuthService authService;

    @Value("${jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Value("${eventflow.auth.refresh-token-ttl-days:30}")
    private long refreshTokenTtlDays;

    @Value("${eventflow.auth.cookie.secure:false}")
    private boolean secureCookies;

    @PostMapping("/signup")
    public ResponseEntity<AuthMessageResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.ok(authService.signup(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return authenticatedResponse(authService.login(request));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@Valid @RequestBody TokenRequest request) {
        return authenticatedResponse(authService.verifyEmail(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @RequestBody(required = false) TokenRequest request,
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshCookie) {

        String refreshToken = request != null && request.getToken() != null && !request.getToken().isBlank()
                ? request.getToken()
                : refreshCookie;
        return authenticatedResponse(authService.refresh(new TokenRequest(refreshToken)));
    }

    @PostMapping("/logout")
    public ResponseEntity<AuthMessageResponse> logout(
            @RequestBody(required = false) TokenRequest request,
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshCookie) {

        String refreshToken = request != null && request.getToken() != null && !request.getToken().isBlank()
                ? request.getToken()
                : refreshCookie;
        AuthMessageResponse response;
        try {
            response = refreshToken != null && !refreshToken.isBlank()
                    ? authService.logout(new TokenRequest(refreshToken))
                    : new AuthMessageResponse("Đăng xuất thành công.");
        } catch (ResponseStatusException ex) {
            response = new AuthMessageResponse("Đăng xuất thành công.");
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, expiredCookie(ACCESS_COOKIE_NAME).toString())
                .header(HttpHeaders.SET_COOKIE, expiredCookie(REFRESH_COOKIE_NAME).toString())
                .body(response);
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<AuthMessageResponse> resendVerification(@Valid @RequestBody EmailRequest request) {
        return ResponseEntity.ok(authService.resendVerificationEmail(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<AuthMessageResponse> forgotPassword(@Valid @RequestBody EmailRequest request) {
        return ResponseEntity.ok(authService.forgotPassword(request));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<AuthMessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    private ResponseEntity<AuthResponse> authenticatedResponse(AuthResponse auth) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookie(
                        ACCESS_COOKIE_NAME,
                        auth.getToken(),
                        Math.max(jwtExpirationMs / 1000, 1)).toString())
                .header(HttpHeaders.SET_COOKIE, authCookie(
                        REFRESH_COOKIE_NAME,
                        auth.getRefreshToken(),
                        Math.max(refreshTokenTtlDays * 24 * 60 * 60, 1)).toString())
                .body(publicAuthResponse(auth));
    }

    private AuthResponse publicAuthResponse(AuthResponse auth) {
        return new AuthResponse(
                null,
                null,
                auth.getUserId(),
                auth.getName(),
                auth.getEmail(),
                auth.getAvatarUrl(),
                auth.getTaskPageSize(),
                auth.getSystemRole());
    }

    private ResponseCookie authCookie(String name, String value, long maxAgeSeconds) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secureCookies)
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAgeSeconds)
                .build();
    }

    private ResponseCookie expiredCookie(String name) {
        return ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(secureCookies)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
    }
}
