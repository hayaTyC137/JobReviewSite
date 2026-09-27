package com.jobreview.employee;

import com.jobreview.common.error.BusinessRuleException;
import com.jobreview.common.error.NotFoundException;
import com.jobreview.common.web.ModerationDecisionRequest;
import com.jobreview.user.User;
import com.jobreview.user.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Проверка дисциплинарных записей модератором и создание записей по удовлетворённым жалобам.
 */
@Service
public class DisciplineModerationService {

    private final DisciplinaryRecordRepository repository;
    private final UserRepository userRepository;

    public DisciplineModerationService(DisciplinaryRecordRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<DisciplineQueueItem> queue(DisciplinaryRecord.Status status) {
        return repository.findByStatusOrderByCreatedAtAsc(status).stream().map(DisciplineQueueItem::from).toList();
    }

    @Transactional
    public DisciplineQueueItem decide(Long id, ModerationDecisionRequest request, Long moderatorId) {
        DisciplinaryRecord record = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Запись не найдена"));
        if (record.getStatus() != DisciplinaryRecord.Status.PENDING) {
            throw new BusinessRuleException("Запись уже рассмотрена");
        }
        record.setStatus(request.approved() ? DisciplinaryRecord.Status.CONFIRMED : DisciplinaryRecord.Status.REJECTED);
        record.setModerator(userRepository.getReferenceById(moderatorId));
        record.setModeratorComment(request.comment());
        record.setResolvedAt(LocalDateTime.now());
        return DisciplineQueueItem.from(record);
    }

    /** Жалоба на пользователя удовлетворена — решение уже принял модератор, запись сразу подтверждена */
    @Transactional
    public void recordUpheldComplaint(User employee, String title, String description, Long moderatorId) {
        DisciplinaryRecord record = new DisciplinaryRecord();
        record.setEmployee(employee);
        record.setSource(DisciplinaryRecord.Source.COMPLAINT);
        record.setSeverity(DisciplinaryRecord.Severity.WARNING);
        record.setTitle(title);
        record.setDescription(description);
        record.setOccurredOn(LocalDate.now());
        record.setStatus(DisciplinaryRecord.Status.CONFIRMED);
        record.setModerator(userRepository.getReferenceById(moderatorId));
        record.setResolvedAt(LocalDateTime.now());
        repository.save(record);
    }

    public record DisciplineQueueItem(Long id, Long employeeId, String employeeName, String companyName,
                                      String reportedByName, DisciplinaryRecord.Source source,
                                      DisciplinaryRecord.Severity severity, String severityLabel, String title,
                                      String description, LocalDate occurredOn, DisciplinaryRecord.Status status,
                                      String moderatorComment, LocalDateTime createdAt) {

        static DisciplineQueueItem from(DisciplinaryRecord r) {
            return new DisciplineQueueItem(r.getId(), r.getEmployee().getId(), r.getEmployee().getDisplayName(),
                    r.getCompany() == null ? null : r.getCompany().getName(),
                    r.getReportedBy() == null ? null : r.getReportedBy().getDisplayName(),
                    r.getSource(), r.getSeverity(), r.getSeverity().label(), r.getTitle(), r.getDescription(),
                    r.getOccurredOn(), r.getStatus(), r.getModeratorComment(), r.getCreatedAt());
        }
    }
}
