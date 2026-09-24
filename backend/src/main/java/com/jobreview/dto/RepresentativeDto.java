package com.jobreview.dto;

import com.jobreview.model.User;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Подтверждённый официальный представитель компании")
public record RepresentativeDto(
        Long id,
        @Schema(example = "Ирина Лебедева") String displayName,
        @Schema(example = "Генеральный директор") String jobTitle
) {

    public static RepresentativeDto from(User user) {
        return new RepresentativeDto(user.getId(), user.getDisplayName(), user.getJobTitle());
    }
}
