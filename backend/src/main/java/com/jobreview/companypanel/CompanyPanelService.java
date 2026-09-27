package com.jobreview.companypanel;

import com.jobreview.appeal.AppealRepository;
import com.jobreview.appeal.AppealStatus;
import com.jobreview.common.error.AccessDeniedOperationException;
import com.jobreview.common.error.BusinessRuleException;
import com.jobreview.common.error.NotFoundException;
import com.jobreview.company.Company;
import com.jobreview.company.CompanyAccess;
import com.jobreview.company.CompanyForm;
import com.jobreview.company.CompanyProfileDto;
import com.jobreview.company.CompanyRepository;
import com.jobreview.company.CompanyStatus;
import com.jobreview.company.SlugGenerator;
import com.jobreview.employee.EmploymentRecordRepository;
import com.jobreview.user.Role;
import com.jobreview.user.User;
import com.jobreview.user.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Кабинет представителя компании (директор, HR).
 *
 * Новая компания попадает в реестр заявкой (PENDING) и публикуется только после проверки модератором.
 * После публикации оформление (логотип, баннер, описание, контакты) меняется сразу,
 * а юридические данные — только через поддержку: от них зависит доверие к профилю.
 */
@Service
public class CompanyPanelService {

    private final CompanyAccess companyAccess;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final SlugGenerator slugGenerator;
    private final AppealRepository appealRepository;
    private final EmploymentRecordRepository employmentRepository;

    public CompanyPanelService(CompanyAccess companyAccess, CompanyRepository companyRepository,
                               UserRepository userRepository, SlugGenerator slugGenerator,
                               AppealRepository appealRepository, EmploymentRecordRepository employmentRepository) {
        this.companyAccess = companyAccess;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.slugGenerator = slugGenerator;
        this.appealRepository = appealRepository;
        this.employmentRepository = employmentRepository;
    }

    @Transactional(readOnly = true)
    public CompanyPanelDtos.Panel panel(Long userId) {
        User user = companyAccess.requireLinkedRepresentative(userId);
        return buildPanel(user, user.getCompany());
    }

    @Transactional
    public CompanyPanelDtos.Panel register(Long userId, CompanyForm form) {
        User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Пользователь не найден"));
        if (user.getRole().isStaff()) {
            throw new AccessDeniedOperationException("Модераторы и администраторы не могут представлять компании");
        }
        if (user.getCompany() != null) {
            throw new BusinessRuleException("Вы уже представляете компанию «" + user.getCompany().getName() + "»");
        }
        if (form.inn() != null && companyRepository.existsByInnAndStatusNot(form.inn(), CompanyStatus.REJECTED)) {
            throw new BusinessRuleException("Компания с таким ИНН/IDNO уже есть в реестре — попросите её представителя пригласить вас");
        }

        Company company = new Company();
        company.setSlug(slugGenerator.uniqueSlug(form.name()));
        applyLegal(company, form);
        applyPresentation(company, form);
        company.setStatus(CompanyStatus.PENDING);
        company.setCreatedBy(user);
        company.setCreatedAt(LocalDateTime.now());
        companyRepository.save(company);

        user.setRole(Role.REPRESENTATIVE);
        user.setCompany(company);
        user.setRepresentativeVerified(false);
        return buildPanel(user, company);
    }

    @Transactional
    public CompanyPanelDtos.Panel update(Long userId, CompanyForm form) {
        User user = companyAccess.requireLinkedRepresentative(userId);
        Company company = user.getCompany();

        switch (company.getStatus()) {
            case APPROVED -> {
                if (!user.isRepresentativeVerified()) {
                    throw new AccessDeniedOperationException("Редактировать профиль можно после подтверждения вашего статуса");
                }
                if (legalChanged(company, form)) {
                    throw new BusinessRuleException("Название, юридическое наименование, ИНН и адрес регистрации проверенной "
                            + "компании меняются через поддержку — напишите нам на странице «Связаться с нами»");
                }
            }
            case SUSPENDED -> throw new BusinessRuleException("Публикация компании приостановлена — обратитесь в поддержку");
            case PENDING, REJECTED -> {
                // Заявку можно править до решения модератора; отклонённая после правки уходит на повторную проверку
                applyLegal(company, form);
                if (company.getStatus() == CompanyStatus.REJECTED) {
                    company.setStatus(CompanyStatus.PENDING);
                    company.setCreatedAt(LocalDateTime.now());
                }
            }
        }
        applyPresentation(company, form);
        return buildPanel(user, company);
    }

    @Transactional
    public CompanyPanelDtos.Panel inviteRepresentative(Long userId, CompanyPanelDtos.InviteRepresentative request) {
        User inviter = companyAccess.requireVerifiedRepresentative(userId);
        User invited = userRepository.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new NotFoundException("Пользователь с таким email не найден — коллега должен сначала зарегистрироваться"));
        if (invited.getRole() != Role.USER || invited.getCompany() != null) {
            throw new BusinessRuleException("Этот пользователь уже представляет компанию или работает на платформе");
        }
        invited.setRole(Role.REPRESENTATIVE);
        invited.setCompany(inviter.getCompany());
        invited.setRepresentativeVerified(false);
        if (request.jobTitle() != null && !request.jobTitle().isBlank()) {
            invited.setJobTitle(request.jobTitle().trim());
        }
        return buildPanel(inviter, inviter.getCompany());
    }

    @Transactional
    public CompanyPanelDtos.Panel removeRepresentative(Long userId, Long representativeId) {
        User actor = companyAccess.requireVerifiedRepresentative(userId);
        if (actor.getId().equals(representativeId)) {
            throw new BusinessRuleException("Нельзя удалить самого себя — попросите коллегу или поддержку");
        }
        User target = userRepository.findById(representativeId)
                .orElseThrow(() -> new NotFoundException("Пользователь не найден"));
        if (target.getCompany() == null || !target.getCompany().getId().equals(actor.getCompany().getId())) {
            throw new AccessDeniedOperationException("Это представитель другой компании");
        }
        target.setRole(Role.USER);
        target.setCompany(null);
        target.setRepresentativeVerified(false);
        return buildPanel(actor, actor.getCompany());
    }

    private CompanyPanelDtos.Panel buildPanel(User viewer, Company company) {
        List<CompanyPanelDtos.RepresentativeView> representatives = userRepository
                .findByCompanyIdAndRoleOrderByCreatedAtAsc(company.getId(), Role.REPRESENTATIVE).stream()
                .map(u -> new CompanyPanelDtos.RepresentativeView(u.getId(), u.getDisplayName(), u.getJobTitle(),
                        u.getEmail(), u.getAvatarUrl(), u.isRepresentativeVerified(), u.getId().equals(viewer.getId())))
                .toList();
        CompanyPanelDtos.Stats stats = new CompanyPanelDtos.Stats(
                company.getRating().getReviewsCount(),
                company.getRating().getOverall(),
                employmentRepository.countByCompanyId(company.getId()),
                employmentRepository.countByCompanyIdAndEndDateIsNull(company.getId()),
                appealRepository.countByReviewCompanyIdAndStatus(company.getId(), AppealStatus.PENDING));
        boolean canManage = viewer.isRepresentativeVerified() && company.isPublished();
        return new CompanyPanelDtos.Panel(CompanyProfileDto.from(company), representatives, canManage, stats);
    }

    private static boolean legalChanged(Company c, CompanyForm f) {
        return !Objects.equals(c.getName(), f.name().trim())
                || !Objects.equals(c.getLegalName(), f.legalName().trim())
                || !Objects.equals(c.getInn(), f.inn())
                || !Objects.equals(c.getLegalAddress(), blankToNull(f.legalAddress()));
    }

    private static void applyLegal(Company c, CompanyForm f) {
        c.setName(f.name().trim());
        c.setLegalName(f.legalName().trim());
        c.setInn(f.inn());
        c.setLegalAddress(blankToNull(f.legalAddress()));
    }

    private static void applyPresentation(Company c, CompanyForm f) {
        c.setCountry(f.country().trim());
        c.setCity(f.city().trim());
        c.setActualAddress(blankToNull(f.actualAddress()));
        c.setPhone(blankToNull(f.phone()));
        c.setEmail(blankToNull(f.email()));
        c.setWebsite(blankToNull(f.website()));
        c.setIndustry(blankToNull(f.industry()));
        c.setEmployeesCount(f.employeesCount());
        c.setFoundedYear(f.foundedYear());
        c.setDescription(blankToNull(f.description()));
        c.setLogoUrl(f.logoUrl());
        c.setBannerUrl(f.bannerUrl());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
