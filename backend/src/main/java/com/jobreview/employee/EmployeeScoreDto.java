package com.jobreview.employee;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "Итоговый рейтинг сотрудника по оценкам работодателей")
public record EmployeeScoreDto(
        @Schema(description = "0–100, null — оценок ещё нет", example = "82") Integer score,
        @Schema(example = "Надёжный специалист") String level,
        int evaluationsCount,
        List<Metric> metrics,
        @Schema(description = "Штраф за подтверждённые дисциплинарные записи", example = "5") int disciplinePenalty
) {

    public record Metric(
            @Schema(example = "teamwork") String key,
            @Schema(example = "Командная работа") String label,
            @Schema(description = "Среднее 1–5, null — нет данных", example = "4.4") Double average,
            @Schema(description = "true — меньше значит лучше (токсичность)") boolean inverted
    ) {
    }
}
