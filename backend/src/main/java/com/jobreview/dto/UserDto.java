package com.jobreview.dto;

import com.jobreview.model.Company;
import com.jobreview.model.Role;
import com.jobreview.model.User;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Данные текущего пользователя — отдаются только ему самому после входа.
 */
@Schema(description = "Текущий пользователь")
public record UserDto(
        Long id,
        String email,
        String displayName,
        String jobTitle,
        String city,
        Role role,
        Long companyId,
        String companySlug,
        String companyName,
        boolean representativeVerified
) {

    public static UserDto from(User user) {
        Company company = user.getCompany();
        return new UserDto(user.getId(), user.getEmail(), user.getDisplayName(), user.getJobTitle(), user.getCity(),
                user.getRole(),
                company == null ? null : company.getId(),
                company == null ? null : company.getSlug(),
                company == null ? null : company.getName(),
                user.isRepresentativeVerified());
    }
}
