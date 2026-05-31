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

    public static String generateToken(Long userId) {
        return generateToken(userId, null);
    }

    public static String generateToken(Long userId, Long expirationMs) {
        try {
            String header = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(new ObjectMapper().writeValueAsBytes(Map.of("alg", "HS256", "typ", "JWT")));

            long exp = (expirationMs != null)
                    ? System.currentTimeMillis() + expirationMs
                    : System.currentTimeMillis() + 86_400_000L;

            Map<String, Object> payload = new HashMap<>();
            payload.put("userId", userId);
            payload.put("exp", exp / 1000);
            payload.put("iat", System.currentTimeMillis() / 1000);

            String payloadB64 = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(new ObjectMapper().writeValueAsBytes(payload));

            String signingInput = header + "." + payloadB64;
            String signature = sign(signingInput, getSecret());

            return signingInput + "." + signature;
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to build JWT", e);
        }
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

    static String getSecret() {
        String secret = System.getenv("JWT_SECRET");
        if (secret == null || secret.isBlank()) {
            secret = "eventflow-mvp-secret-2026-summer-change-in-prod";
        }
        return secret;
    }
}
