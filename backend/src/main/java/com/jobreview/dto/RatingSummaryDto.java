package com.jobreview.dto;

import com.jobreview.model.CompanyRating;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Сводный рейтинг компании")
public record RatingSummaryDto(
        @Schema(description = "Средняя общая оценка, null если отзывов нет", example = "4.4") Double overall,
        @Schema(description = "Количество учтённых отзывов", example = "22") int reviewsCount,
        CriteriaDto criteria
) {

    public static RatingSummaryDto from(CompanyRating rating) {
        return new RatingSummaryDto(rating.getOverall(), rating.getReviewsCount(), CriteriaDto.from(rating));
    }
}
