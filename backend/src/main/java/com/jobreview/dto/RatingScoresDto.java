package com.jobreview.dto;

import com.jobreview.model.RatingScores;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Оценки одного отзыва по критериям. Используется и во входящих запросах, и в ответах.
 */
@Schema(description = "Оценки отзыва по критериям, каждая от 1 до 5")
public record RatingScoresDto(
        @Min(1) @Max(5) @Schema(example = "4") int climate,
        @Min(1) @Max(5) @Schema(example = "4") int management,
        @Min(1) @Max(5) @Schema(example = "5") int team,
        @Min(1) @Max(5) @Schema(example = "4") int office,
        @Min(1) @Max(5) @Schema(example = "3") int clients,
        @Min(1) @Max(5) @Schema(example = "4") int growth
) {

    public static RatingScoresDto from(RatingScores scores) {
        return new RatingScoresDto(scores.getClimate(), scores.getManagement(), scores.getTeam(),
                scores.getOffice(), scores.getClients(), scores.getGrowth());
    }

    public RatingScores toEntity() {
        return new RatingScores(climate, management, team, office, clients, growth);
    }
}
