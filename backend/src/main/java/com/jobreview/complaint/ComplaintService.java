package com.jobreview.complaint;

import com.jobreview.common.error.AccessDeniedOperationException;
import com.jobreview.common.error.BusinessRuleException;
import com.jobreview.common.error.NotFoundException;
import com.jobreview.common.web.ModerationDecisionRequest;
import com.jobreview.company.Company;
import com.jobreview.company.CompanyRatingService;
import com.jobreview.company.CompanyRepository;
import com.jobreview.employee.DisciplineModerationService;
import com.jobreview.employee.EmployeeEvaluation;
import com.jobreview.employee.EmployeeEvaluationRepository;
import com.jobreview.review.Review;
import com.jobreview.review.ReviewRepository;
import com.jobreview.review.ReviewStatus;
import com.jobreview.user.User;
import com.jobreview.user.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Центр жалоб: пользователи жалуются, модераторы разбирают.
 *
 * Если жалоба удовлетворена, последствие зависит от типа цели:
 * отзыв и оценка работодателя скрываются (рейтинг компании пересчитывается),
 * пользователю добавляется подтверждённая запись в дисциплинарную историю,
 * по компании фиксируется решение (приостановить публикацию может администратор).
 */
@Service
public class ComplaintService {

    private static final int PREVIEW_LENGTH = 180;

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final EmployeeEvaluationRepository evaluationRepository;
    private final CompanyRepository companyRepository;
    private final CompanyRatingService ratingService;
    private final DisciplineModerationService disciplineService;

    public ComplaintService(ComplaintRepository complaintRepository, UserRepository userRepository,
                            ReviewRepository reviewRepository, EmployeeEvaluationRepository evaluationRepository,
                            CompanyRepository companyRepository, CompanyRatingService ratingService,
                            DisciplineModerationService disciplineService) {
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
        this.evaluationRepository = evaluationRepository;
        this.companyRepository = companyRepository;
        this.ratingService = ratingService;
        this.disciplineService = disciplineService;
    }

    @Transactional
    public ComplaintDtos.ComplaintView create(ComplaintDtos.CreateComplaint request, Long authorId) {
        User author = userRepository.findById(authorId).orElseThrow(() -> new NotFoundException("Пользователь не найден"));
        Long ownerId = targetOwnerId(request.targetType(), request.targetId());
        if (authorId.equals(ownerId)) {
            throw new AccessDeniedOperationException("Нельзя пожаловаться на самого себя или собственный отзыв");
        }
        if (complaintRepository.existsByAuthorIdAndTargetTypeAndTargetIdAndStatus(authorId, request.targetType(),
                request.targetId(), Complaint.Status.OPEN)) {
            throw new BusinessRuleException("Ваша жалоба на этот объект уже на рассмотрении");
        }
        Complaint complaint = new Complaint();
        complaint.setAuthor(author);
        complaint.setTargetType(request.targetType());
        complaint.setTargetId(request.targetId());
        complaint.setReason(request.reason());
        complaint.setDetails(request.details().trim());
        complaintRepository.save(complaint);
        return toView(complaint);
    }

    @Transactional(readOnly = true)
    public List<ComplaintDtos.ComplaintView> mine(Long authorId) {
        return complaintRepository.findByAuthorIdOrderByCreatedAtDesc(authorId).stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public List<ComplaintDtos.ComplaintView> queue(Complaint.Status status) {
        return complaintRepository.findByStatusOrderByCreatedAtAsc(status).stream().map(this::toView).toList();
    }

    @Transactional
    public ComplaintDtos.ComplaintView decide(Long id, ModerationDecisionRequest request, Long moderatorId) {
        Complaint complaint = complaintRepository.findById(id).orElseThrow(() -> new NotFoundException("Жалоба не найдена"));
        if (complaint.getStatus() != Complaint.Status.OPEN) {
            throw new BusinessRuleException("Жалоба уже рассмотрена");
        }
        boolean upheld = request.approved();
        complaint.setStatus(upheld ? Complaint.Status.UPHELD : Complaint.Status.REJECTED);
        complaint.setModerator(userRepository.getReferenceById(moderatorId));
        complaint.setResolution(request.comment());
        complaint.setResolvedAt(LocalDateTime.now());
        if (upheld) {
            applyConsequences(complaint, moderatorId);
        }
        return toView(complaint);
    }

    private void applyConsequences(Complaint complaint, Long moderatorId) {
        switch (complaint.getTargetType()) {
            case REVIEW -> {
                Review review = reviewRepository.findById(complaint.getTargetId())
                        .orElseThrow(() -> new NotFoundException("Отзыв не найден"));
                review.setStatus(ReviewStatus.HIDDEN);
                reviewRepository.save(review);
                ratingService.recalculate(review.getCompany());
            }
            case EVALUATION -> evaluationRepository.findById(complaint.getTargetId())
                    .ifPresent(e -> e.setStatus(EmployeeEvaluation.Status.HIDDEN));
            case USER -> userRepository.findById(complaint.getTargetId()).ifPresent(user ->
                    disciplineService.recordUpheldComplaint(user,
                            "Подтверждённая жалоба: " + complaint.getReason().label().toLowerCase(),
                            complaint.getDetails(), moderatorId));
            case COMPANY -> {
                // Автоматических последствий нет: решение о приостановке принимает администратор
            }
        }
    }

    /** Проверяет, что цель существует, и возвращает id её «владельца» (чтобы запретить жалобы на себя) */
    private Long targetOwnerId(Complaint.TargetType type, Long id) {
        return switch (type) {
            case REVIEW -> reviewRepository.findById(id)
                    .filter(r -> r.getStatus() != ReviewStatus.HIDDEN)
                    .map(r -> r.getAuthor().getId())
                    .orElseThrow(() -> new NotFoundException("Отзыв не найден"));
            case EVALUATION -> evaluationRepository.findWithEmploymentById(id)
                    .filter(e -> e.getStatus() == EmployeeEvaluation.Status.PUBLISHED)
                    .map(e -> e.getAuthor().getId())
                    .orElseThrow(() -> new NotFoundException("Оценка не найдена"));
            case USER -> userRepository.findById(id).map(User::getId)
                    .orElseThrow(() -> new NotFoundException("Пользователь не найден"));
            case COMPANY -> companyRepository.findById(id).filter(Company::isPublished).map(c -> -1L)
                    .orElseThrow(() -> new NotFoundException("Компания не найдена"));
        };
    }

    private ComplaintDtos.ComplaintView toView(Complaint c) {
        String preview = null;
        String link = null;
        switch (c.getTargetType()) {
            case REVIEW -> {
                Review r = reviewRepository.findById(c.getTargetId()).orElse(null);
                if (r != null) {
                    preview = "Отзыв о «" + r.getCompany().getName() + "» от " + r.getAuthor().getDisplayName() + ": "
                            + shorten(r.getText());
                    link = "/companies/" + r.getCompany().getSlug();
                }
            }
            case EVALUATION -> {
                EmployeeEvaluation e = evaluationRepository.findWithEmploymentById(c.getTargetId()).orElse(null);
                if (e != null) {
                    preview = "Оценка сотрудника " + e.getEmployment().getEmployee().getDisplayName() + " от «"
                            + e.getEmployment().getCompany().getName() + "»"
                            + (e.getComment() == null ? "" : ": " + shorten(e.getComment()));
                    link = "/employees/" + e.getEmployment().getEmployee().getId();
                }
            }
            case USER -> {
                User u = userRepository.findById(c.getTargetId()).orElse(null);
                if (u != null) {
                    preview = "Пользователь " + u.getDisplayName();
                    link = "/employees/" + u.getId();
                }
            }
            case COMPANY -> {
                Company company = companyRepository.findById(c.getTargetId()).orElse(null);
                if (company != null) {
                    preview = "Компания «" + company.getName() + "»";
                    link = company.isPublished() ? "/companies/" + company.getSlug() : null;
                }
            }
        }
        return new ComplaintDtos.ComplaintView(c.getId(), c.getTargetType(), c.getTargetId(),
                preview == null ? "Объект удалён" : preview, link, c.getReason(), c.getReason().label(), c.getDetails(),
                c.getStatus(), c.getResolution(), c.getAuthor().getId(), c.getAuthor().getDisplayName(),
                c.getCreatedAt(), c.getResolvedAt());
    }

    private static String shorten(String text) {
        return text.length() <= PREVIEW_LENGTH ? text : text.substring(0, PREVIEW_LENGTH) + "…";
    }
}
