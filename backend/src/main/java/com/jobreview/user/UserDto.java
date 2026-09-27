package com.jobreview.user;

import com.jobreview.company.Company;
import com.jobreview.company.CompanyStatus;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Данные текущего пользователя — отдаются только ему самому (и администратору).
 */
@Schema(description = "Текущий пользователь")
public record UserDto(
        Long id,
        String email,
        String displayName,
        @Schema(description = "Полное ФИО, видно только владельцу и модераторам") String fullName,
        String jobTitle,
        String city,
        String country,
        String bio,
        String avatarUrl,
        Role role,
        AuthProvider authProvider,
        Long companyId,
        String companySlug,
        String companyName,
        @Schema(description = "Статус компании в реестре (для представителя)") CompanyStatus companyStatus,
        boolean representativeVerified,
        @Schema(description = "false — пользователь вошёл через соцсеть и ещё не дозаполнил профиль") boolean profileCompleted
) {

    public static UserDto from(User user) {
        Company company = user.getCompany();
        return new UserDto(user.getId(), user.getEmail(), user.getDisplayName(), user.getFullName(),
                user.getJobTitle(), user.getCity(), user.getCountry(), user.getBio(), user.getAvatarUrl(),
                user.getRole(), user.getAuthProvider(),
                company == null ? null : company.getId(),
                company == null ? null : company.getSlug(),
                company == null ? null : company.getName(),
                company == null ? null : company.getStatus(),
                user.isRepresentativeVerified(),
                user.isProfileCompleted());
    }
}
