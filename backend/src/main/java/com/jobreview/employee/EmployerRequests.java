package com.jobreview.employee;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Запросы панели работодателя: трудовая история, оценки и замечания */
public final class EmployerRequests {

    private EmployerRequests() {
    }

    @Schema(description = "Новая запись трудовой истории")
    public record AddEmployment(
            @NotBlank @Email @Size(max = 160) @Schema(example = "anna.k@demo.ru") String email,
            @NotBlank @Size(max = 160) @Schema(example = "Product Designer") String position,
            @NotNull @PastOrPresent @Schema(example = "2023-03-01") LocalDate startDate,
            @PastOrPresent @Schema(description = "Пусто — работает сейчас", example = "2025-06-30") LocalDate endDate,
            DismissalReason dismissalReason,
            @Size(max = 1000) String dismissalNote
    ) {
    }

    @Schema(description = "Изменение записи трудовой истории (например, увольнение)")
    public record UpdateEmployment(
            @NotBlank @Size(max = 160) String position,
            @NotNull @PastOrPresent LocalDate startDate,
            @PastOrPresent LocalDate endDate,
            DismissalReason dismissalReason,
            @Size(max = 1000) String dismissalNote
    ) {
    }

    @Schema(description = "Оценка сотрудника работодателем")
    public record Evaluate(
            @NotNull @Valid EvaluationScoresDto scores,
            @Size(max = 2000) @Schema(example = "Спокойно работает под нагрузкой, помогает новичкам.") String comment
    ) {
    }

    @Schema(description = "Замечание сотруднику — публикуется после проверки модератором")
    public record ReportDiscipline(
            @NotNull DisciplinaryRecord.Severity severity,
            @NotBlank @Size(max = 200) @Schema(example = "Срыв сроков релиза") String title,
            @NotBlank @Size(min = 20, max = 2000) String description,
            @NotNull @PastOrPresent LocalDate occurredOn
    ) {
    }
}
