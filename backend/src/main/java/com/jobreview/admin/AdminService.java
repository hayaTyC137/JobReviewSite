package com.jobreview.admin;

import com.jobreview.common.error.BusinessRuleException;
import com.jobreview.common.error.InvalidInputException;
import com.jobreview.common.error.NotFoundException;
import com.jobreview.common.web.PageResponse;
import com.jobreview.company.Company;
import com.jobreview.company.CompanyProfileDto;
import com.jobreview.company.CompanyRatingService;
import com.jobreview.company.CompanyRepository;
import com.jobreview.company.CompanyStatus;
import com.jobreview.review.Review;
import com.jobreview.review.ReviewRepository;
import com.jobreview.review.ReviewStatus;
import com.jobreview.user.Role;
import com.jobreview.user.User;
import com.jobreview.user.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Администрирование: пользователи (роли, блокировки), реестр отзывов и компаний.
 * Изменения ролей и блокировки действуют сразу — JWT-фильтр читает права из базы.
 */
@Service
public class AdminService {

    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final CompanyRepository companyRepository;
    private final CompanyRatingService ratingService;

    public AdminService(UserRepository userRepository, ReviewRepository reviewRepository,
                        CompanyRepository companyRepository, CompanyRatingService ratingService) {
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
        this.companyRepository = companyRepository;
        this.ratingService = ratingService;
    }

    // ---------- Пользователи ----------

    @Transactional(readOnly = true)
    public PageResponse<AdminDtos.AdminUser> users(String q, Role role, Boolean blocked, int page, int size) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(cb.like(cb.lower(root.get("email")), pattern),
                        cb.like(cb.lower(root.get("displayName")), pattern),
                        cb.like(cb.lower(root.get("fullName")), pattern)));
            }
            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }
            if (blocked != null) {
                predicates.add(cb.equal(root.get("blocked"), blocked));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        var result = userRepository.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"))));
        return PageResponse.from(result.map(AdminDtos.AdminUser::from));
    }

    @Transactional
    public AdminDtos.AdminUser changeRole(Long actorId, Long userId, AdminDtos.ChangeRole request) {
        User user = otherUser(actorId, userId, "Нельзя изменить собственную роль — попросите другого администратора");
        if (user.getRole() == Role.ADMIN && request.role() != Role.ADMIN && userRepository.countByRole(Role.ADMIN) <= 1) {
            throw new BusinessRuleException("Нельзя понизить последнего администратора");
        }
        if (request.role() == Role.REPRESENTATIVE) {
            if (request.companyId() == null) {
                throw new InvalidInputException("Для роли представителя укажите компанию");
            }
            Company company = companyRepository.findById(request.companyId())
                    .orElseThrow(() -> new NotFoundException("Компания не найдена"));
            user.setCompany(company);
            user.setRepresentativeVerified(true);
        } else {
            user.setCompany(null);
            user.setRepresentativeVerified(false);
        }
        user.setRole(request.role());
        return AdminDtos.AdminUser.from(user);
    }

    @Transactional
    public AdminDtos.AdminUser changeBlock(Long actorId, Long userId, AdminDtos.ChangeBlock request) {
        User user = otherUser(actorId, userId, "Нельзя заблокировать самого себя");
        if (request.blocked() && (request.reason() == null || request.reason().isBlank())) {
            throw new InvalidInputException("Укажите причину блокировки — её увидят другие администраторы");
        }
        user.setBlocked(request.blocked());
        user.setBlockedReason(request.blocked() ? request.reason().trim() : null);
        return AdminDtos.AdminUser.from(user);
    }

    // ---------- Отзывы ----------

    @Transactional(readOnly = true)
    public PageResponse<AdminDtos.AdminReview> reviews(String q, ReviewStatus status, int page, int size) {
        Specification<Review> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(cb.like(cb.lower(root.get("text")), pattern),
                        cb.like(cb.lower(root.get("company").get("name")), pattern),
                        cb.like(cb.lower(root.get("author").get("displayName")), pattern)));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        var result = reviewRepository.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
        return PageResponse.from(result.map(AdminDtos.AdminReview::from));
    }

    @Transactional
    public AdminDtos.AdminReview changeReviewStatus(Long reviewId, ReviewStatus status) {
        if (status == ReviewStatus.UNDER_APPEAL) {
            throw new InvalidInputException("Статус «на обжаловании» ставится только заявкой представителя");
        }
        Review review = reviewRepository.findById(reviewId).orElseThrow(() -> new NotFoundException("Отзыв не найден"));
        review.setStatus(status);
        reviewRepository.save(review);
        ratingService.recalculate(review.getCompany());
        return AdminDtos.AdminReview.from(review);
    }

    // ---------- Компании ----------

    @Transactional(readOnly = true)
    public PageResponse<CompanyProfileDto> companies(String q, CompanyStatus status, int page, int size) {
        Specification<Company> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("legalName")), pattern)));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        var result = companyRepository.findAll(spec, PageRequest.of(page, size, Sort.by("name")));
        return PageResponse.from(result.map(CompanyProfileDto::from));
    }

    private User otherUser(Long actorId, Long userId, String selfMessage) {
        if (actorId.equals(userId)) {
            throw new BusinessRuleException(selfMessage);
        }
        return userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Пользователь не найден"));
    }
}
