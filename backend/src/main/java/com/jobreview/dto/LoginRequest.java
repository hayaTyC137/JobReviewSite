package com.jobreview.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Вход по email и паролю")
public record LoginRequest(
        @NotBlank @Email @Schema(example = "anna.k@demo.ru") String email,
        @NotBlank @Schema(example = "demo12345") String password
) {
}
