package com.jobreview.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

/**
 * Краткая публичная карточка автора отзыва. Email и прочие личные данные сюда не попадают.
 */
@Schema(description = "Публичная карточка автора отзыва")
public record AuthorCardDto(
        Long id,
        @Schema(example = "Анна К.") String displayName,
        @Schema(example = "Product Designer") String jobTitle,
        @Schema(example = "Москва") String city,
        LocalDate memberSince,
        long reviewsCount,
        long companiesCount,
        boolean verifiedRepresentative,
        @Schema(description = "Компания, которую представляет автор (если он представитель)") String representedCompany,
        CandidateRatingDto candidateRating
) {
}
