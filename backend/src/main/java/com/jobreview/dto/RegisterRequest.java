package com.jobreview.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Регистрация нового пользователя")
public record RegisterRequest(
        @NotBlank @Email @Size(max = 160) @Schema(example = "new.user@mail.ru") String email,
        @NotBlank @Size(min = 8, max = 100) @Schema(example = "strongPass1") String password,
        @NotBlank @Size(max = 120) @Schema(example = "Мария П.") String displayName,
        @Size(max = 120) @Schema(example = "Системный аналитик") String jobTitle,
        @Size(max = 120) @Schema(example = "Казань") String city
) {
}
