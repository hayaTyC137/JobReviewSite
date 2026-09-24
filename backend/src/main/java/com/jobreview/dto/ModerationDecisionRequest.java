package com.jobreview.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Решение модератора по заявке")
public record ModerationDecisionRequest(
        @NotNull @Schema(description = "APPROVE — скрыть отзыв, REJECT — оставить опубликованным", example = "REJECT")
        Decision decision,
        @Size(max = 1000) @Schema(example = "Автор подтвердил трудоустройство справкой.") String comment
) {

    public enum Decision {
        APPROVE,
        REJECT
    }
}
