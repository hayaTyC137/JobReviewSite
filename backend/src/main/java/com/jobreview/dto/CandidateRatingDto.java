package com.jobreview.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Открытый рейтинг активности автора отзывов (0–100) с расшифровкой по критериям,
 * чтобы читатель понимал, откуда взялось число.
 */
@Schema(description = "Рейтинг кандидатской активности")
public record CandidateRatingDto(
        @Schema(example = "68") int score,
        @Schema(example = "Активный участник") String level,
        List<Part> parts
) {

    @Schema(description = "Одно слагаемое рейтинга")
    public record Part(
            @Schema(example = "Опубликованные отзывы") String label,
            @Schema(example = "30") int points,
            @Schema(example = "40") int maxPoints,
            @Schema(example = "3 отзыва × 10 баллов") String hint
    ) {
    }
}
