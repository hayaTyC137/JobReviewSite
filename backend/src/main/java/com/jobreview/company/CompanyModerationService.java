package com.jobreview.company;

import com.jobreview.common.error.BusinessRuleException;
import com.jobreview.common.error.NotFoundException;
import com.jobreview.common.web.ModerationDecisionRequest;
import com.jobreview.user.Role;
import com.jobreview.user.User;
import com.jobreview.user.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Реестр компаний со стороны платформы: проверка заявок модератором и смена статуса администратором.
 * Одобрение заявки публикует компанию и подтверждает её создателя как представителя.
 */
@Service
public class CompanyModerationService {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    public CompanyModerationService(CompanyRepository companyRepository, UserRepository userRepository) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<CompanyProfileDto> queue(CompanyStatus status) {
        return companyRepository.findByStatusOrderByCreatedAtAsc(status).stream().map(CompanyProfileDto::from).toList();
    }

    @Transactional
    public CompanyProfileDto decide(Long companyId, ModerationDecisionRequest request, Long moderatorId) {
        Company company = get(companyId);
        if (company.getStatus() != CompanyStatus.PENDING) {
            throw new BusinessRuleException("Заявка уже рассмотрена");
        }
        if (request.approved()) {
            publish(company);
        } else {
            if (request.comment() == null || request.comment().isBlank()) {
                throw new BusinessRuleException("Укажите причину отказа — представитель увидит её в панели компании");
            }
            company.setStatus(CompanyStatus.REJECTED);
        }
        company.setModerationComment(request.comment());
        company.setReviewedAt(LocalDateTime.now());
        return CompanyProfileDto.from(company);
    }

    /** Администратор может вручную опубликовать, приостановить или вернуть компанию на проверку */
    @Transactional
    public CompanyProfileDto changeStatus(Long companyId, CompanyStatus status, String comment) {
        Company company = get(companyId);
        if (status == CompanyStatus.APPROVED) {
            publish(company);
        } else {
            company.setStatus(status);
        }
        company.setModerationComment(comment);
        company.setReviewedAt(LocalDateTime.now());
        return CompanyProfileDto.from(company);
    }

    private void publish(Company company) {
        company.setStatus(CompanyStatus.APPROVED);
        User creator = company.getCreatedBy();
        if (creator != null && creator.getRole() == Role.REPRESENTATIVE && creator.getCompany() != null
                && creator.getCompany().getId().equals(company.getId())) {
            creator.setRepresentativeVerified(true);
        }
    }

    // ---------- Представители, приглашённые в уже опубликованные компании ----------

    @Transactional(readOnly = true)
    public List<PendingRepresentative> pendingRepresentatives() {
        return userRepository.findPendingRepresentatives().stream()
                .map(u -> new PendingRepresentative(u.getId(), u.getDisplayName(), u.getEmail(), u.getJobTitle(),
                        u.getCompany().getId(), u.getCompany().getName(), u.getCompany().getSlug()))
                .toList();
    }

    @Transactional
    public PendingRepresentative decideRepresentative(Long userId, ModerationDecisionRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Пользователь не найден"));
        if (user.getRole() != Role.REPRESENTATIVE || user.isRepresentativeVerified() || user.getCompany() == null) {
            throw new BusinessRuleException("Пользователь не ожидает подтверждения");
        }
        Company company = user.getCompany();
        if (request.approved()) {
            user.setRepresentativeVerified(true);
        } else {
            user.setRole(Role.USER);
            user.setCompany(null);
        }
        return new PendingRepresentative(user.getId(), user.getDisplayName(), user.getEmail(), user.getJobTitle(),
                company.getId(), company.getName(), company.getSlug());
    }

    /** Модератор назначает представителя напрямую, после проверки документов вне платформы */
    @Transactional
    public User assignRepresentative(Long userId, Long companyId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Пользователь не найден"));
        if (user.getRole().isStaff()) {
            throw new BusinessRuleException("Модератор или администратор не может представлять компанию");
        }
        Company company = get(companyId);
        user.setRole(Role.REPRESENTATIVE);
        user.setCompany(company);
        user.setRepresentativeVerified(true);
        return user;
    }

    private Company get(Long id) {
        return companyRepository.findById(id).orElseThrow(() -> new NotFoundException("Компания не найдена"));
    }

    public record PendingRepresentative(Long userId, String displayName, String email, String jobTitle,
                                        Long companyId, String companyName, String companySlug) {
    }
}
