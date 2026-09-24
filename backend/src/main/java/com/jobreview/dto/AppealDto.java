package com.jobreview.dto;

import com.jobreview.model.Appeal;
import com.jobreview.model.AppealStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

/**
 * Заявка на обжалование в том виде, в каком её видит модератор или сам представитель.
 */
@Schema(description = "Заявка на обжалование отзыва")
public record AppealDto(
        Long id,
        Long reviewId,
        String reviewText,
        int reviewOverall,
        String companyName,
        String companySlug,
        Long representativeId,
        String representativeName,
        String reason,
        AppealStatus status,
        String moderatorComment,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt
) {

    public static AppealDto from(Appeal appeal) {
        var review = appeal.getReview();
        var company = review.getCompany();
        var rep = appeal.getRepresentative();
        return new AppealDto(appeal.getId(), review.getId(), review.getText(), review.getOverallRating(),
                company.getName(), company.getSlug(), rep.getId(), rep.getDisplayName(), appeal.getReason(),
                appeal.getStatus(), appeal.getModeratorComment(), appeal.getCreatedAt(), appeal.getResolvedAt());
    }
}
