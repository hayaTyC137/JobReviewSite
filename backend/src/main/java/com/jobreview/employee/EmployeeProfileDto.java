package com.jobreview.employee;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Карточка сотрудника: рейтинг от работодателей, трудовая история и дисциплина.
 * Видна самому сотруднику, подтверждённым представителям компаний и модераторам.
 */
@Schema(description = "Карточка сотрудника")
public record EmployeeProfileDto(
        Person employee,
        EmployeeScoreDto score,
        @Schema(description = "Суммарный стаж по всем записям, месяцев") long totalTenureMonths,
        int companiesCount,
        List<Employment> history,
        List<Discipline> discipline,
        @Schema(description = "Карточку смотрит сам сотрудник — ему видны и неподтверждённые записи") boolean ownProfile
) {

    public record Person(Long id, String displayName, String jobTitle, String city, String country,
                         String avatarUrl, LocalDate memberSince) {
    }

    public record Employment(Long id, Long companyId, String companyName, String companySlug, String companyLogoUrl,
                             String position, LocalDate startDate, LocalDate endDate, long tenureMonths,
                             DismissalReason dismissalReason, String dismissalReasonLabel, String dismissalNote,
                             Evaluation evaluation) {
    }

    public record Evaluation(Long id, EvaluationScoresDto scores, String comment, String authorName,
                             String authorJobTitle, LocalDateTime updatedAt) {
    }

    public record Discipline(Long id, String companyName, DisciplinaryRecord.Source source,
                             DisciplinaryRecord.Severity severity, String severityLabel, String title,
                             String description, LocalDate occurredOn, DisciplinaryRecord.Status status,
                             String moderatorComment) {

        static Discipline from(DisciplinaryRecord r) {
            return new Discipline(r.getId(), r.getCompany() == null ? null : r.getCompany().getName(), r.getSource(),
                    r.getSeverity(), r.getSeverity().label(), r.getTitle(), r.getDescription(), r.getOccurredOn(),
                    r.getStatus(), r.getModeratorComment());
        }
    }
}
