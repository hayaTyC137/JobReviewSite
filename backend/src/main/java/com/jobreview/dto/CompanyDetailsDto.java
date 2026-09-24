package com.jobreview.dto;

import com.jobreview.model.Company;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Полная информация об организации для детальной страницы.
 */
@Schema(description = "Полные сведения о компании")
public record CompanyDetailsDto(
        Long id,
        String slug,
        String name,
        @Schema(example = "ООО «Нова Диджитал»") String legalName,
        @Schema(example = "7707123456") String inn,
        String country,
        String city,
        @Schema(description = "Юридический адрес") String legalAddress,
        @Schema(description = "Фактический адрес офиса") String actualAddress,
        String phone,
        String email,
        String website,
        String industry,
        Integer employeesCount,
        Integer foundedYear,
        String description,
        RatingSummaryDto rating,
        @Schema(description = "Подтверждённый представитель, null если его нет") RepresentativeDto representative
) {

    public static CompanyDetailsDto from(Company c, RepresentativeDto representative) {
        return new CompanyDetailsDto(c.getId(), c.getSlug(), c.getName(), c.getLegalName(), c.getInn(),
                c.getCountry(), c.getCity(), c.getLegalAddress(), c.getActualAddress(), c.getPhone(),
                c.getEmail(), c.getWebsite(), c.getIndustry(), c.getEmployeesCount(), c.getFoundedYear(),
                c.getDescription(), RatingSummaryDto.from(c.getRating()), representative);
    }
}
