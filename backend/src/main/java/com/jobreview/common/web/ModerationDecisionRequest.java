package com.jobreview.common.web;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Решение модератора по любой заявке из очередей: обжалование отзыва, новая компания,
 * смена данных профиля, дисциплинарная запись, жалоба, приглашённый представитель.
 */
@Schema(description = "Решение модератора по заявке")
public record ModerationDecisionRequest(
        @NotNull
        @Schema(description = "APPROVE — удовлетворить заявку (для обжалования — скрыть отзыв), REJECT — отклонить", example = "REJECT")
        Decision decision,
        @Size(max = 1000) @Schema(example = "Автор подтвердил трудоустройство справкой.") String comment
) {

    public enum Decision {
        APPROVE,
        REJECT
    }

    public boolean approved() {
        return decision == Decision.APPROVE;
    }
}
