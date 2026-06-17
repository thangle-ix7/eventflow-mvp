package com.eventflow.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "eventflow.payment.payos")
public class PayOsProperties {
    private boolean enabled;
    private String baseUrl = "https://api-merchant.payos.vn";
    private String clientId;
    private String apiKey;
    private String checksumKey;
    private int expireMinutes = 15;
}
