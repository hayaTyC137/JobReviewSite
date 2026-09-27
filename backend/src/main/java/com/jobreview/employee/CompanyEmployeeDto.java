package com.jobreview.employee;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

@Schema(description = "Сотрудник в панели компании")
public record CompanyEmployeeDto(
        Long recordId,
        Long employeeId,
        String displayName,
        String jobTitle,
        String avatarUrl,
        String position,
        LocalDate startDate,
        LocalDate endDate,
        DismissalReason dismissalReason,
        String dismissalNote,
        @Schema(description = "Оценка компании этому сотруднику, null — ещё не оценён") EvaluationScoresDto evaluation,
        String evaluationComment
) {

    static CompanyEmployeeDto from(EmploymentRecord r, EmployeeEvaluation e) {
        var u = r.getEmployee();
        return new CompanyEmployeeDto(r.getId(), u.getId(), u.getDisplayName(), u.getJobTitle(), u.getAvatarUrl(),
                r.getPosition(), r.getStartDate(), r.getEndDate(), r.getDismissalReason(), r.getDismissalNote(),
                e == null ? null : EvaluationScoresDto.from(e.getScores()), e == null ? null : e.getComment());
    }
}
