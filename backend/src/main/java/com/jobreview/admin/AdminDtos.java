package com.jobreview.admin;

import com.jobreview.company.CompanyStatus;
import com.jobreview.review.Review;
import com.jobreview.review.ReviewStatus;
import com.jobreview.user.AuthProvider;
import com.jobreview.user.Role;
import com.jobreview.user.User;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public final class AdminDtos {

    private AdminDtos() {
    }

    @Schema(description = "Пользователь в админке")
    public record AdminUser(Long id, String email, String displayName, String fullName, Role role, AuthProvider authProvider,
                            Long companyId, String companyName, boolean representativeVerified, boolean blocked,
                            String blockedReason, LocalDateTime createdAt, LocalDateTime lastLoginAt) {

        public static AdminUser from(User u) {
            return new AdminUser(u.getId(), u.getEmail(), u.getDisplayName(), u.getFullName(), u.getRole(),
                    u.getAuthProvider(), u.getCompany() == null ? null : u.getCompany().getId(),
                    u.getCompany() == null ? null : u.getCompany().getName(), u.isRepresentativeVerified(),
                    u.isBlocked(), u.getBlockedReason(), u.getCreatedAt(), u.getLastLoginAt());
        }
    }

    @Schema(description = "Смена роли пользователя")
    public record ChangeRole(
            @NotNull @Schema(example = "MODERATOR") Role role,
            @Schema(description = "Обязателен для роли REPRESENTATIVE", example = "3") Long companyId
    ) {
    }

    @Schema(description = "Блокировка или разблокировка")
    public record ChangeBlock(
            boolean blocked,
            @Size(max = 400) @Schema(example = "Массовая публикация заказных отзывов") String reason
    ) {
    }

    @Schema(description = "Отзыв в реестре отзывов")
    public record AdminReview(Long id, Long companyId, String companyName, String companySlug, Long authorId,
                              String authorName, String position, int overall, String text, ReviewStatus status,
                              LocalDateTime createdAt) {

        public static AdminReview from(Review r) {
            return new AdminReview(r.getId(), r.getCompany().getId(), r.getCompany().getName(), r.getCompany().getSlug(),
                    r.getAuthor().getId(), r.getAuthor().getDisplayName(), r.getPosition(), r.getOverallRating(),
                    r.getText(), r.getStatus(), r.getCreatedAt());
        }
    }

    @Schema(description = "Скрыть или вернуть отзыв")
    public record ChangeReviewStatus(@NotNull @Schema(example = "HIDDEN") ReviewStatus status) {
    }

    @Schema(description = "Смена статуса компании в реестре")
    public record ChangeCompanyStatus(
            @NotNull @Schema(example = "SUSPENDED") CompanyStatus status,
            @Size(max = 1000) String comment
    ) {
    }

    @Schema(description = "Новое значение настройки")
    public record ChangeSetting(@NotNull @Size(max = 1000) String value) {
    }
}
