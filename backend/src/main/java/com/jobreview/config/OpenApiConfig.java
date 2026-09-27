package com.jobreview.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/**
 * Общее описание API для Swagger UI (/swagger-ui.html).
 * Схема bearerAuth добавляет кнопку Authorize: туда вставляется JWT из /api/auth/login.
 */
@Configuration
@OpenAPIDefinition(info = @Info(
        title = "Контур API",
        version = "0.1.0",
        description = "Поиск работодателей, аналитика оценок, отзывы сотрудников и модерация обжалований.",
        contact = @Contact(name = "Команда Контура")))
@SecurityScheme(
        name = OpenApiConfig.BEARER_AUTH,
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT из ответа /api/auth/login или после входа через Google")
public class OpenApiConfig {

    public static final String BEARER_AUTH = "bearerAuth";
}
