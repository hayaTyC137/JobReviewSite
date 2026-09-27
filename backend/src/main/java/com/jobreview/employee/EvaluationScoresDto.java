package com.jobreview.employee;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@Schema(description = "Метрики сотрудника, каждая от 1 до 5 (токсичность: 1 — не токсичен)")
public record EvaluationScoresDto(
        @Min(1) @Max(5) @Schema(example = "1") int toxicity,
        @Min(1) @Max(5) @Schema(example = "4") int composure,
        @Min(1) @Max(5) @Schema(example = "5") int productivity,
        @Min(1) @Max(5) @Schema(example = "4") int teamwork,
        @Min(1) @Max(5) @Schema(example = "5") int reliability,
        @Min(1) @Max(5) @Schema(example = "4") int communication
) {

    public static EvaluationScoresDto from(EvaluationScores s) {
        return new EvaluationScoresDto(s.getToxicity(), s.getComposure(), s.getProductivity(), s.getTeamwork(),
                s.getReliability(), s.getCommunication());
    }

    public EvaluationScores toEntity() {
        return new EvaluationScores(toxicity, composure, productivity, teamwork, reliability, communication);
    }
}
