package com.jobreview.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Минимальные данные профиля, которые запрашиваются после первого входа через соцсеть.
 */
@Schema(description = "Дозаполнение профиля после входа через соцсеть")
public record OnboardingRequest(
        @NotBlank @Size(max = 120) @Schema(example = "Мария П.") String displayName,
        @Size(max = 120) @Schema(example = "Системный аналитик") String jobTitle,
        @NotBlank @Size(max = 80) @Schema(example = "Молдова") String country,
        @NotBlank @Size(max = 120) @Schema(example = "Кишинёв") String city,
        @Email @Size(max = 160)
        @Schema(description = "Обязателен, если провайдер не передал подтверждённый email") String email,
        @AssertTrue(message = "Нужно согласие с правилами платформы и обработкой персональных данных")
        boolean acceptTerms
) {
}
