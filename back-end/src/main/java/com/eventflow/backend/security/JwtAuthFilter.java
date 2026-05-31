package com.eventflow.backend.security;

import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            Claims claims = validateToken(token);
            Long userId = claims.userId();

            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                log.warn("JWT valid but user not found: userId={}", userId);
                filterChain.doFilter(request, response);
                return;
            }

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userId, null, Collections.emptyList());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (Exception e) {
            log.debug("Invalid JWT token: {}", e.getMessage());
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    private Claims validateToken(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new IllegalArgumentException("JWT must have 3 parts");
        }

        String payloadJson = new String(java.util.Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        String signature = parts[2];

        String signedContent = parts[0] + "." + parts[1];

        String expectedSignature = hmacSha256(signedContent, jwtSecret);

        if (!constantTimeEquals(signature, expectedSignature)) {
            throw new SecurityException("JWT signature mismatch");
        }

        Claims claims = parsePayload(payloadJson);

        if (claims.expiration() != null && claims.expiration() * 1000 < System.currentTimeMillis()) {
            throw new SecurityException("JWT expired");
        }

        if (claims.userId() == null) {
            throw new IllegalArgumentException("JWT payload missing userId");
        }

        return claims;
    }

    private String hmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute HMAC", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }

    private Claims parsePayload(String payloadJson) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            java.util.Map<String, Object> map = mapper.readValue(payloadJson, java.util.Map.class);

            Long userId = null;
            if (map.get("userId") instanceof Number n) {
                userId = n.longValue();
            }

            Long expiration = null;
            if (map.get("exp") instanceof Number n) {
                expiration = n.longValue();
            }

            List<String> roles = Collections.emptyList();
            Object rolesObj = map.get("roles");
            if (rolesObj instanceof List<?> list) {
                roles = list.stream()
                        .filter(String.class::isInstance)
                        .map(String.class::cast)
                        .toList();
            }

            return new Claims(userId, expiration, roles);

        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse JWT payload", e);
        }
    }

    public record Claims(Long userId, Long expiration, List<String> roles) {
    }
}
