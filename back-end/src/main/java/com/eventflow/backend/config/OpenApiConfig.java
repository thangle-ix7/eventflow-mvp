package com.eventflow.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.HandlerMethod;

import java.util.List;

@Configuration
public class OpenApiConfig {

    private static final String BEARER_AUTH = "bearerAuth";

    @Value("${eventflow.openapi.server-url:/}")
    private String serverUrl;

    @Bean
    public OpenAPI eventFlowOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("EventFlow API")
                        .version("v1")
                        .description("REST API for EventFlow event, department, task, auth, and notification workflows.")
                        .contact(new Contact().name("EventFlow"))
                        .license(new License().name("Private")))
                .servers(List.of(new Server().url(serverUrl).description("Configured server")))
                .schemaRequirement(BEARER_AUTH, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT"))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH));
    }

    @Bean
    public OperationCustomizer publicEndpointCustomizer() {
        return (operation, handlerMethod) -> {
            if (isPublicEndpoint(handlerMethod)) {
                operation.setSecurity(List.of());
            }
            return operation;
        };
    }

    private boolean isPublicEndpoint(HandlerMethod handlerMethod) {
        String controllerName = handlerMethod.getBeanType().getSimpleName();
        return "AuthController".equals(controllerName)
                || "TelegramWebhookController".equals(controllerName);
    }
}
