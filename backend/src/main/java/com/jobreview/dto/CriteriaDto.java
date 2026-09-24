package com.jobreview.dto;

import com.jobreview.model.CompanyRating;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Средние оценки по критериям (0–5, может быть null, если данных нет).
 */
@Schema(description = "Средние оценки по критериям, шкала 0–5")
public record CriteriaDto(
        @Schema(description = "Психологический климат", example = "4.6") Double climate,
        @Schema(description = "Руководство", example = "4.1") Double management,
        @Schema(description = "Коллектив", example = "4.8") Double team,
        @Schema(description = "Условия и расположение офиса", example = "4.3") Double office,
        @Schema(description = "Работа с клиентами", example = "3.9") Double clients,
        @Schema(description = "Карьерный рост и обучение", example = "4.4") Double growth
) {

    public static CriteriaDto from(CompanyRating rating) {
        return new CriteriaDto(rating.getClimate(), rating.getManagement(), rating.getTeam(),
                rating.getOffice(), rating.getClients(), rating.getGrowth());
    }
}
