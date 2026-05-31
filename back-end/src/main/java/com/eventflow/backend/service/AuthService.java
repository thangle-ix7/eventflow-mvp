package com.eventflow.backend.service;

import com.eventflow.backend.dto.AuthResponse;
import com.eventflow.backend.dto.LoginRequest;
import com.eventflow.backend.dto.SignupRequest;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.UserRepository;
import com.eventflow.backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email đã được sử dụng");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        User saved = userRepository.save(user);
        String token = JwtUtil.generateToken(saved.getId());

        return new AuthResponse(token, saved.getId(), saved.getName(), saved.getEmail());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Email hoặc mật khẩu không đúng"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Email hoặc mật khẩu không đúng");
        }

        String token = JwtUtil.generateToken(user.getId());
        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail());
    }
}