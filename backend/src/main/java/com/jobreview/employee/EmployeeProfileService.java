package com.jobreview.employee;

import com.jobreview.common.error.AccessDeniedOperationException;
import com.jobreview.security.UserPrincipal;
import com.jobreview.user.User;
import com.jobreview.user.UserService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Сборка карточки сотрудника и проверка, кто её может видеть.
 *
 * Оценки работодателей — чувствительные персональные данные, поэтому карточка не публичная:
 * её видят сам сотрудник, подтверждённые представители компаний (оценивают кандидатов)
 * и сотрудники платформы. Неподтверждённые замечания видит только сам сотрудник и модераторы.
 */
@Service
public class EmployeeProfileService {

    private final UserService userService;
    private final EmploymentRecordRepository employmentRepository;
    private final EmployeeEvaluationRepository evaluationRepository;
    private final DisciplinaryRecordRepository disciplineRepository;
    private final EmployeeScoreCalculator calculator;

    public EmployeeProfileService(UserService userService, EmploymentRecordRepository employmentRepository,
                                  EmployeeEvaluationRepository evaluationRepository,
                                  DisciplinaryRecordRepository disciplineRepository, EmployeeScoreCalculator calculator) {
        this.userService = userService;
        this.employmentRepository = employmentRepository;
        this.evaluationRepository = evaluationRepository;
        this.disciplineRepository = disciplineRepository;
        this.calculator = calculator;
    }

    @Transactional(readOnly = true)
    public EmployeeProfileDto getProfile(Long employeeId, UserPrincipal viewer) {
        boolean own = viewer.getId().equals(employeeId);
        if (!own && !viewer.isStaff()) {
            User viewerUser = userService.getUser(viewer.getId());
            if (!viewerUser.isVerifiedRepresentative()) {
                throw new AccessDeniedOperationException(
                        "Карточку сотрудника видят сам сотрудник, подтверждённые представители компаний и модераторы");
            }
        }
        User employee = userService.getUser(employeeId);
        boolean seeUnconfirmed = own || viewer.isStaff();

        List<EmploymentRecord> records = employmentRepository.findByEmployeeIdOrderByStartDateDesc(employeeId);
        Map<Long, EmployeeEvaluation> evaluations = evaluationRepository
                .findByEmploymentIdInAndStatus(records.stream().map(EmploymentRecord::getId).toList(),
                        EmployeeEvaluation.Status.PUBLISHED)
                .stream()
                .collect(Collectors.toMap(e -> e.getEmployment().getId(), Function.identity()));

        List<DisciplinaryRecord> discipline = disciplineRepository.findByEmployeeIdOrderByOccurredOnDesc(employeeId).stream()
                .filter(d -> seeUnconfirmed || d.getStatus() == DisciplinaryRecord.Status.CONFIRMED)
                .toList();
        long confirmed = discipline.stream().filter(d -> d.getStatus() == DisciplinaryRecord.Status.CONFIRMED).count();

        LocalDate today = LocalDate.now();
        List<EmployeeProfileDto.Employment> history = records.stream()
                .map(r -> toDto(r, evaluations.get(r.getId()), today))
                .toList();

        EmployeeScoreDto score = calculator.calculate(
                evaluations.values().stream().map(EmployeeEvaluation::getScores).toList(), confirmed);

        return new EmployeeProfileDto(
                new EmployeeProfileDto.Person(employee.getId(), employee.getDisplayName(), employee.getJobTitle(),
                        employee.getCity(), employee.getCountry(), employee.getAvatarUrl(),
                        employee.getCreatedAt().toLocalDate()),
                score,
                records.stream().mapToLong(r -> r.tenureMonths(today)).sum(),
                (int) records.stream().map(r -> r.getCompany().getId()).distinct().count(),
                history,
                discipline.stream().map(EmployeeProfileDto.Discipline::from).toList(),
                own);
    }

    private static EmployeeProfileDto.Employment toDto(EmploymentRecord r, EmployeeEvaluation e, LocalDate today) {
        EmployeeProfileDto.Evaluation evaluation = e == null ? null : new EmployeeProfileDto.Evaluation(
                e.getId(), EvaluationScoresDto.from(e.getScores()), e.getComment(),
                e.getAuthor().getDisplayName(), e.getAuthor().getJobTitle(), e.getUpdatedAt());
        return new EmployeeProfileDto.Employment(r.getId(), r.getCompany().getId(), r.getCompany().getName(),
                r.getCompany().isPublished() ? r.getCompany().getSlug() : null, r.getCompany().getLogoUrl(),
                r.getPosition(), r.getStartDate(), r.getEndDate(), r.tenureMonths(today), r.getDismissalReason(),
                r.getDismissalReason() == null ? null : r.getDismissalReason().label(), r.getDismissalNote(), evaluation);
    }
}
