package com.jobreview.dto;

import com.jobreview.model.EmploymentStatus;
import com.jobreview.model.Review;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

/**
 * Короткая версия отзыва для карточки компании в результатах поиска.
 */
@Schema(description = "Самый свежий отзыв для карточки в поиске")
public record ReviewPreviewDto(
        Long id,
        Long authorId,
        String authorName,
        @Schema(example = "Frontend Engineer") String position,
        EmploymentStatus employmentStatus,
        @Schema(example = "4") int overall,
        String text,
        LocalDateTime createdAt
) {

    public static ReviewPreviewDto from(Review review) {
        return new ReviewPreviewDto(review.getId(), review.getAuthor().getId(), review.getAuthor().getDisplayName(),
                review.getPosition(), review.getEmploymentStatus(), review.getOverallRating(),
                review.getText(), review.getCreatedAt());
    }
}
