package com.jobreview.company;

import com.jobreview.common.web.ValidationPatterns;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Данные компании из панели представителя: и для заявки в реестр, и для редактирования профиля.
 * Необязательные поля передаются как null (пустая строка не пройдёт проверку формата).
 */
@Schema(description = "Профиль компании")
public record CompanyForm(
        @NotBlank @Size(max = 200) @Schema(example = "Codru Digital") String name,
        @NotBlank @Size(max = 300) @Schema(example = "SRL «Codru Digital»") String legalName,
        @Pattern(regexp = ValidationPatterns.TAX_ID, message = "ИНН/IDNO — от 9 до 13 цифр")
        @Schema(example = "1019600012345") String inn,
        @NotBlank @Size(max = 80) @Schema(example = "Молдова") String country,
        @NotBlank @Size(max = 120) @Schema(example = "Кишинёв") String city,
        @Size(max = 400) String legalAddress,
        @Size(max = 400) String actualAddress,
        @Pattern(regexp = ValidationPatterns.PHONE, message = "Телефон: цифры, пробелы, скобки и дефисы")
        @Schema(example = "+373 22 123 456") String phone,
        @Email @Size(max = 120) String email,
        @Pattern(regexp = ValidationPatterns.WEBSITE, message = "Укажите адрес сайта, например codru.md")
        @Size(max = 200) String website,
        @Size(max = 160) String industry,
        @Min(1) @Max(1_000_000) Integer employeesCount,
        @Min(1800) @Max(2100) Integer foundedYear,
        @Size(max = 4000) String description,
        @Pattern(regexp = ValidationPatterns.UPLOADED_IMAGE, message = "Загрузите логотип через /api/files") String logoUrl,
        @Pattern(regexp = ValidationPatterns.UPLOADED_IMAGE, message = "Загрузите баннер через /api/files") String bannerUrl
) {
}
