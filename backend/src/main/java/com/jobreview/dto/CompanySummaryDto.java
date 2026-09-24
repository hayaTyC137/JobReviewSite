package com.jobreview.dto;

import com.jobreview.model.Company;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Удлинённая карточка компании в списке поиска: всё нужное, чтобы решить,
 * открывать ли детальную страницу.
 */
@Schema(description = "Карточка компании в результатах поиска")
public record CompanySummaryDto(
        Long id,
        @Schema(example = "nova-studio") String slug,
        @Schema(example = "NOVA Studio") String name,
        @Schema(example = "Россия") String country,
        @Schema(example = "Москва") String city,
        @Schema(example = "Дизайн и цифровые продукты") String industry,
        @Schema(description = "Краткое описание (до 180 символов)") String shortDescription,
        RatingSummaryDto rating,
        @Schema(description = "Самый свежий видимый отзыв, null если отзывов нет") ReviewPreviewDto latestReview
) {

    private static final int SHORT_DESCRIPTION_LIMIT = 180;

    public static CompanySummaryDto from(Company company, ReviewPreviewDto latestReview) {
        return new CompanySummaryDto(company.getId(), company.getSlug(), company.getName(),
                company.getCountry(), company.getCity(), company.getIndustry(),
                shorten(company.getDescription()), RatingSummaryDto.from(company.getRating()), latestReview);
    }

    /** Обрезаем описание по границе слова, чтобы карточки были одинаковой высоты */
    private static String shorten(String text) {
        if (text == null || text.length() <= SHORT_DESCRIPTION_LIMIT) {
            return text;
        }
        int cut = text.lastIndexOf(' ', SHORT_DESCRIPTION_LIMIT);
        return text.substring(0, cut > 0 ? cut : SHORT_DESCRIPTION_LIMIT) + "…";
    }
}
