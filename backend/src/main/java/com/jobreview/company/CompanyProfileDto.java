package com.jobreview.company;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

/**
 * Полный профиль компании для её представителей и модераторов — со статусом в реестре.
 */
@Schema(description = "Профиль компании в панели управления")
public record CompanyProfileDto(
        Long id,
        String slug,
        String name,
        String legalName,
        String inn,
        String country,
        String city,
        String legalAddress,
        String actualAddress,
        String phone,
        String email,
        String website,
        String industry,
        Integer employeesCount,
        Integer foundedYear,
        String description,
        String logoUrl,
        String bannerUrl,
        CompanyStatus status,
        @Schema(description = "Комментарий модератора к последнему решению") String moderationComment,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt,
        RatingSummaryDto rating,
        Applicant applicant
) {

    public record Applicant(Long id, String displayName, String email, String jobTitle) {
    }

    public static CompanyProfileDto from(Company c) {
        var creator = c.getCreatedBy();
        return new CompanyProfileDto(c.getId(), c.getSlug(), c.getName(), c.getLegalName(), c.getInn(), c.getCountry(),
                c.getCity(), c.getLegalAddress(), c.getActualAddress(), c.getPhone(), c.getEmail(), c.getWebsite(),
                c.getIndustry(), c.getEmployeesCount(), c.getFoundedYear(), c.getDescription(), c.getLogoUrl(),
                c.getBannerUrl(), c.getStatus(), c.getModerationComment(), c.getCreatedAt(), c.getReviewedAt(),
                RatingSummaryDto.from(c.getRating()),
                creator == null ? null
                        : new Applicant(creator.getId(), creator.getDisplayName(), creator.getEmail(), creator.getJobTitle()));
    }
}
