package com.eventflow.backend.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

public final class JwtUtil {

    private static final String HMAC_ALGO = "HmacSHA256";

    private JwtUtil() {}

    public static String generateToken(Long userId, String secret, Long expirationMs) {
        return generateToken(userId, requireSecret(secret), expirationMs != null ? expirationMs : 86_400_000L);
    }

    private static String generateToken(Long userId, String secret, long expirationMs) {
        try {
            String header = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(new ObjectMapper().writeValueAsBytes(Map.of("alg", "HS256", "typ", "JWT")));

            long exp = System.currentTimeMillis() + expirationMs;

            Map<String, Object> payload = new HashMap<>();
            payload.put("userId", userId);
            payload.put("exp", exp / 1000);
            payload.put("iat", System.currentTimeMillis() / 1000);

            String payloadB64 = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(new ObjectMapper().writeValueAsBytes(payload));

            String signingInput = header + "." + payloadB64;
            String signature = sign(signingInput, secret);

            return signingInput + "." + signature;
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to build JWT", e);
        }
    }

    public static String requireSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET must be configured");
        }
        return secret;
    }

    static String sign(String data, String secret) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGO));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to sign JWT", e);
        }
    }

}
