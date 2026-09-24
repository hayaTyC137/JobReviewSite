package com.jobreview.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Расширенная аналитика для детальной страницы компании.
 */
@Schema(description = "Аналитика оценок компании")
public record CompanyAnalyticsDto(
        @Schema(description = "Средняя общая оценка по месяцам за последние 12 месяцев") List<MonthlyPoint> monthlyTrend,
        @Schema(description = "Сколько отзывов поставили 1, 2, 3, 4 и 5 звёзд") List<DistributionBucket> distribution,
        @Schema(description = "Средние по критериям у нынешних сотрудников") CriteriaDto currentEmployees,
        @Schema(description = "Средние по критериям у бывших сотрудников") CriteriaDto formerEmployees,
        int currentCount,
        int formerCount
) {

    /** Точка графика динамики. average = null, если в этом месяце отзывов не было */
    public record MonthlyPoint(@Schema(example = "2026-08") String month, Double average, int reviewsCount) {
    }

    public record DistributionBucket(@Schema(example = "5") int stars, int count) {
    }
}
