package com.jobreview.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Назначение пользователя официальным представителем компании")
public record AssignRepresentativeRequest(
        @NotNull @Schema(example = "1") Long companyId
) {
}
