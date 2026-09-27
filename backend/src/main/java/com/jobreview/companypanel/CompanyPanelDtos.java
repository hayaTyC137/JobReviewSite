package com.jobreview.companypanel;

import com.jobreview.company.CompanyProfileDto;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class CompanyPanelDtos {

    private CompanyPanelDtos() {
    }

    @Schema(description = "Панель управления компанией")
    public record Panel(
            CompanyProfileDto company,
            List<RepresentativeView> representatives,
            @Schema(description = "Представитель подтверждён и компания опубликована — доступны сотрудники и приглашения")
            boolean canManage,
            Stats stats
    ) {
    }

    public record RepresentativeView(Long id, String displayName, String jobTitle, String email, String avatarUrl,
                                     boolean verified, boolean you) {
    }

    public record Stats(long reviewsCount, Double averageRating, long employeesTotal, long employeesCurrent,
                        long pendingAppeals) {
    }

    @Schema(description = "Приглашение коллеги (директор, HR) в представители компании")
    public record InviteRepresentative(
            @NotBlank @Email @Size(max = 160) @Schema(example = "hr@codru.md") String email,
            @Size(max = 120) @Schema(example = "HR-директор") String jobTitle
    ) {
    }
}
