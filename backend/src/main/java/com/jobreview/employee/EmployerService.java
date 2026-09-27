package com.jobreview.employee;

import com.jobreview.common.error.AccessDeniedOperationException;
import com.jobreview.common.error.BusinessRuleException;
import com.jobreview.common.error.InvalidInputException;
import com.jobreview.common.error.NotFoundException;
import com.jobreview.company.Company;
import com.jobreview.company.CompanyAccess;
import com.jobreview.user.User;
import com.jobreview.user.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Действия работодателя с сотрудниками: трудовая история, оценки, замечания.
 * Всё доступно только подтверждённому представителю опубликованной компании и только для её сотрудников.
 */
@Service
public class EmployerService {

    private final CompanyAccess companyAccess;
    private final UserRepository userRepository;
    private final EmploymentRecordRepository employmentRepository;
    private final EmployeeEvaluationRepository evaluationRepository;
    private final DisciplinaryRecordRepository disciplineRepository;

    public EmployerService(CompanyAccess companyAccess, UserRepository userRepository,
                           EmploymentRecordRepository employmentRepository,
                           EmployeeEvaluationRepository evaluationRepository,
                           DisciplinaryRecordRepository disciplineRepository) {
        this.companyAccess = companyAccess;
        this.userRepository = userRepository;
        this.employmentRepository = employmentRepository;
        this.evaluationRepository = evaluationRepository;
        this.disciplineRepository = disciplineRepository;
    }

    @Transactional(readOnly = true)
    public List<CompanyEmployeeDto> listEmployees(Long representativeId) {
        Company company = companyAccess.requireVerifiedRepresentative(representativeId).getCompany();
        List<EmploymentRecord> records = employmentRepository.findByCompanyIdOrderByStartDateDesc(company.getId());
        Map<Long, EmployeeEvaluation> evaluations = evaluationRepository
                .findByEmploymentIdInAndStatus(records.stream().map(EmploymentRecord::getId).toList(),
                        EmployeeEvaluation.Status.PUBLISHED)
                .stream()
                .collect(Collectors.toMap(e -> e.getEmployment().getId(), Function.identity()));
        return records.stream().map(r -> CompanyEmployeeDto.from(r, evaluations.get(r.getId()))).toList();
    }

    @Transactional
    public CompanyEmployeeDto addEmployment(Long representativeId, EmployerRequests.AddEmployment request) {
        User representative = companyAccess.requireVerifiedRepresentative(representativeId);
        Company company = representative.getCompany();
        User employee = userRepository.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new NotFoundException(
                        "Пользователь с таким email не найден — попросите сотрудника зарегистрироваться на платформе"));

        if (employee.getId().equals(representative.getId())) {
            throw new AccessDeniedOperationException("Нельзя вести собственную трудовую историю — это конфликт интересов");
        }
        if (request.endDate() == null && employmentRepository.existsByEmployeeIdAndCompanyIdAndEndDateIsNull(employee.getId(), company.getId())) {
            throw new BusinessRuleException("У сотрудника уже есть открытая запись о работе в вашей компании");
        }

        EmploymentRecord record = new EmploymentRecord();
        record.setEmployee(employee);
        record.setCompany(company);
        record.setRecordedBy(representative);
        apply(record, request.position(), request.startDate(), request.endDate(), request.dismissalReason(), request.dismissalNote());
        employmentRepository.save(record);
        return CompanyEmployeeDto.from(record, null);
    }

    @Transactional
    public CompanyEmployeeDto updateEmployment(Long representativeId, Long recordId, EmployerRequests.UpdateEmployment request) {
        EmploymentRecord record = ownRecord(representativeId, recordId);
        apply(record, request.position(), request.startDate(), request.endDate(), request.dismissalReason(), request.dismissalNote());
        return CompanyEmployeeDto.from(record, evaluationRepository.findByEmploymentId(recordId)
                .filter(e -> e.getStatus() == EmployeeEvaluation.Status.PUBLISHED).orElse(null));
    }

    /** Оценка создаётся или обновляется: одна на запись о работе */
    @Transactional
    public CompanyEmployeeDto evaluate(Long representativeId, Long recordId, EmployerRequests.Evaluate request) {
        EmploymentRecord record = ownRecord(representativeId, recordId);
        User author = userRepository.getReferenceById(representativeId);
        EmployeeEvaluation evaluation = evaluationRepository.findByEmploymentId(recordId).orElseGet(() -> {
            EmployeeEvaluation created = new EmployeeEvaluation();
            created.setEmployment(record);
            return created;
        });
        if (evaluation.getStatus() == EmployeeEvaluation.Status.HIDDEN) {
            throw new BusinessRuleException("Оценка скрыта модератором по жалобе и не может быть изменена");
        }
        evaluation.setAuthor(author);
        evaluation.setScores(request.scores().toEntity());
        evaluation.setComment(blankToNull(request.comment()));
        evaluation.setUpdatedAt(LocalDateTime.now());
        evaluationRepository.save(evaluation);
        return CompanyEmployeeDto.from(record, evaluation);
    }

    @Transactional
    public EmployeeProfileDto.Discipline reportDiscipline(Long representativeId, Long recordId, EmployerRequests.ReportDiscipline request) {
        EmploymentRecord record = ownRecord(representativeId, recordId);
        LocalDate periodEnd = record.getEndDate() == null ? LocalDate.now() : record.getEndDate();
        if (request.occurredOn().isBefore(record.getStartDate()) || request.occurredOn().isAfter(periodEnd)) {
            throw new InvalidInputException("Дата нарушения должна попадать в период работы сотрудника");
        }
        DisciplinaryRecord discipline = new DisciplinaryRecord();
        discipline.setEmployee(record.getEmployee());
        discipline.setCompany(record.getCompany());
        discipline.setReportedBy(userRepository.getReferenceById(representativeId));
        discipline.setSource(DisciplinaryRecord.Source.EMPLOYER);
        discipline.setSeverity(request.severity());
        discipline.setTitle(request.title().trim());
        discipline.setDescription(request.description().trim());
        discipline.setOccurredOn(request.occurredOn());
        discipline.setStatus(DisciplinaryRecord.Status.PENDING);
        disciplineRepository.save(discipline);
        return EmployeeProfileDto.Discipline.from(discipline);
    }

    private EmploymentRecord ownRecord(Long representativeId, Long recordId) {
        User representative = companyAccess.requireVerifiedRepresentative(representativeId);
        EmploymentRecord record = employmentRepository.findById(recordId)
                .orElseThrow(() -> new NotFoundException("Запись о работе не найдена"));
        if (!record.getCompany().getId().equals(representative.getCompany().getId())) {
            throw new AccessDeniedOperationException("Это сотрудник другой компании");
        }
        if (record.getEmployee().getId().equals(representativeId)) {
            throw new AccessDeniedOperationException("Нельзя оценивать самого себя");
        }
        return record;
    }

    private static void apply(EmploymentRecord record, String position, LocalDate start, LocalDate end,
                              DismissalReason reason, String note) {
        if (end != null && end.isBefore(start)) {
            throw new InvalidInputException("Дата увольнения не может быть раньше даты приёма");
        }
        if (end != null && reason == null) {
            throw new InvalidInputException("Укажите официальную причину увольнения");
        }
        record.setPosition(position.trim());
        record.setStartDate(start);
        record.setEndDate(end);
        record.setDismissalReason(end == null ? null : reason);
        record.setDismissalNote(end == null ? null : blankToNull(note));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
