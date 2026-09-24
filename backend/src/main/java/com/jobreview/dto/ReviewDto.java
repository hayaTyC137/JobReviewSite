package com.jobreview.dto;

import com.jobreview.model.Appeal;
import com.jobreview.model.EmploymentStatus;
import com.jobreview.model.Review;
import com.jobreview.model.ReviewStatus;
import com.jobreview.model.Role;
import com.jobreview.model.User;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

/**
 * Полный отзыв для ленты на странице компании.
 */
@Schema(description = "Отзыв сотрудника о компании")
public record ReviewDto(
        Long id,
        Long companyId,
        Author author,
        EmploymentStatus employmentStatus,
        String position,
        int overall,
        RatingScoresDto scores,
        String text,
        ReviewStatus status,
        LocalDateTime createdAt,
        @Schema(description = "Открытая заявка на обжалование, если есть") PendingAppeal pendingAppeal
) {

    @Schema(description = "Автор отзыва — подробности доступны по /api/users/{id}/card")
    public record Author(Long id, String displayName,
                         @Schema(description = "Автор — подтверждённый представитель какой-либо компании") boolean verifiedRepresentative) {

        static Author from(User user) {
            boolean verified = user.getRole() == Role.REPRESENTATIVE && user.isRepresentativeVerified();
            return new Author(user.getId(), user.getDisplayName(), verified);
        }
    }

    @Schema(description = "Кратко о заявке на обжалование, которую видят все посетители")
    public record PendingAppeal(Long id, String representativeName, String representativeJobTitle, LocalDateTime createdAt) {

        static PendingAppeal from(Appeal appeal) {
            User rep = appeal.getRepresentative();
            return new PendingAppeal(appeal.getId(), rep.getDisplayName(), rep.getJobTitle(), appeal.getCreatedAt());
        }
    }

    public static ReviewDto from(Review review, Appeal pendingAppeal) {
        return new ReviewDto(review.getId(), review.getCompany().getId(), Author.from(review.getAuthor()),
                review.getEmploymentStatus(), review.getPosition(), review.getOverallRating(),
                RatingScoresDto.from(review.getScores()), review.getText(), review.getStatus(),
                review.getCreatedAt(), pendingAppeal == null ? null : PendingAppeal.from(pendingAppeal));
    }
}
