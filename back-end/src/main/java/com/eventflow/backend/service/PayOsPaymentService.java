package com.eventflow.backend.service;

import com.eventflow.backend.config.PayOsProperties;
import com.eventflow.backend.entity.PaymentTransaction;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class PayOsPaymentService {

    private static final String CREATE_PAYMENT_PATH = "/v2/payment-requests";

    private final PayOsProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public boolean isReady() {
        return properties.isEnabled()
                && hasText(properties.getBaseUrl())
                && hasText(properties.getClientId())
                && hasText(properties.getApiKey())
                && hasText(properties.getChecksumKey());
    }

    public PayOsCheckout createPaymentLink(
            PaymentTransaction transaction,
            String returnUrl,
            String cancelUrl,
            LocalDateTime now) {

        if (!isReady()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "payOS chưa được cấu hình. Vui lòng thiết lập PAYOS_CLIENT_ID, PAYOS_API_KEY và PAYOS_CHECKSUM_KEY.");
        }

        long orderCode = Long.parseLong(transaction.getProviderOrderId());
        String description = "EF" + transaction.getId();
        long expiredAt = now.plusMinutes(properties.getExpireMinutes())
                .atZone(ZoneId.systemDefault())
                .toEpochSecond();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderCode", orderCode);
        body.put("amount", transaction.getAmountVnd());
        body.put("description", description);
        body.put("buyerName", transaction.getUser().getName());
        body.put("buyerEmail", transaction.getUser().getEmail());
        body.put("items", List.of(Map.of(
                "name", transaction.getPlan().getDisplayName(),
                "quantity", 1,
                "price", transaction.getAmountVnd())));
        body.put("returnUrl", returnUrl);
        body.put("cancelUrl", cancelUrl);
        body.put("expiredAt", expiredAt);
        body.put("signature", signature(Map.of(
                "amount", transaction.getAmountVnd(),
                "cancelUrl", cancelUrl,
                "description", description,
                "orderCode", orderCode,
                "returnUrl", returnUrl)));

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(trimTrailingSlash(properties.getBaseUrl()) + CREATE_PAYMENT_PATH))
                    .header("Content-Type", "application/json")
                    .header("x-client-id", properties.getClientId())
                    .header("x-api-key", properties.getApiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "payOS trả về lỗi HTTP " + response.statusCode());
            }

            Map<?, ?> json = objectMapper.readValue(response.body(), Map.class);
            if (!"00".equals(String.valueOf(json.get("code")))) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "payOS chưa tạo được link thanh toán: " + String.valueOf(json.get("desc")));
            }

            Map<?, ?> data = (Map<?, ?>) json.get("data");
            String checkoutUrl = stringValue(data.get("checkoutUrl"));
            if (!hasText(checkoutUrl)) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "payOS không trả checkoutUrl");
            }

            return new PayOsCheckout(checkoutUrl, stringValue(data.get("paymentLinkId")), response.body());
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Không kết nối được payOS", ex);
        }
    }

    public boolean isValidWebhookData(Map<String, Object> data, String receivedSignature) {
        return hasText(receivedSignature)
                && signature(data).equalsIgnoreCase(receivedSignature);
    }

    public String signature(Map<String, ?> data) {
        TreeMap<String, ?> sorted = new TreeMap<>(data);
        List<String> parts = new ArrayList<>();
        sorted.forEach((key, value) -> {
            if (value != null) {
                parts.add(key + "=" + canonicalValue(value));
            }
        });
        return hmacSha256(properties.getChecksumKey(), String.join("&", parts));
    }

    private String canonicalValue(Object value) {
        if (value instanceof Map<?, ?> map) {
            TreeMap<String, Object> sorted = new TreeMap<>();
            map.forEach((key, mapValue) -> sorted.put(String.valueOf(key), mapValue));
            return sorted.toString();
        }
        if (value instanceof Iterable<?> iterable) {
            List<String> values = new ArrayList<>();
            iterable.forEach(item -> values.add(canonicalValue(item)));
            return "[" + String.join(",", values) + "]";
        }
        return String.valueOf(value);
    }

    private String hmacSha256(String key, String data) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            hmac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] bytes = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hash = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                hash.append(String.format("%02x", b));
            }
            return hash.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Không tạo được chữ ký payOS", ex);
        }
    }

    private String trimTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String stringValue(Object value) {
        return value != null ? String.valueOf(value) : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            return String.valueOf(payload);
        }
    }

    public record PayOsCheckout(String checkoutUrl, String paymentLinkId, String rawPayload) {
    }
}
