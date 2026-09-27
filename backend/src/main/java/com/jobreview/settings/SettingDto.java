package com.jobreview.settings;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "Системная настройка")
public record SettingDto(
        @Schema(example = "reviews.daily_limit") String key,
        @Schema(example = "3") String value,
        String defaultValue,
        String description,
        @Schema(description = "null — используется значение по умолчанию") LocalDateTime updatedAt
) {
}
