package com.jobreview.appeal;

import com.jobreview.common.error.AccessDeniedOperationException;
import com.jobreview.common.error.BusinessRuleException;
import com.jobreview.common.error.NotFoundException;
import com.jobreview.company.CompanyRatingService;
import com.jobreview.common.web.ModerationDecisionRequest;
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
 * Обжалование отзывов.
 *
 * Сценарий: подтверждённый представитель компании подаёт жалобу → отзыв получает статус
 * UNDER_APPEAL и остаётся виден с пометкой → модератор принимает решение:
 * APPROVE — отзыв скрывается и перестаёт влиять на рейтинг, REJECT — отзыв снова обычный.
 */
@Service
public class AppealService {

    private final AppealRepository appealRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final CompanyRatingService ratingService;

    public AppealService(AppealRepository appealRepository, ReviewRepository reviewRepository,
                         UserRepository userRepository, CompanyRatingService ratingService) {
        this.appealRepository = appealRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.ratingService = ratingService;
    }

    @Transactional
    public AppealDto create(Long reviewId, CreateAppealRequest request, Long representativeId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new NotFoundException("Отзыв не найден"));
        User representative = getUser(representativeId);

        if (!representative.isVerifiedRepresentativeOf(review.getCompany())) {
            throw new AccessDeniedOperationException(
                    "Обжаловать отзыв может только подтверждённый представитель этой компании");
        }
        if (review.getStatus() == ReviewStatus.HIDDEN) {
            throw new BusinessRuleException("Отзыв уже скрыт модератором");
        }
        if (appealRepository.existsByReviewIdAndStatus(reviewId, AppealStatus.PENDING)) {
            throw new BusinessRuleException("По этому отзыву уже есть заявка на рассмотрении");
        }

        Appeal appeal = new Appeal();
        appeal.setReview(review);
        appeal.setRepresentative(representative);
        appeal.setReason(request.reason().trim());
        appeal.setStatus(AppealStatus.PENDING);
        appealRepository.save(appeal);

        review.setStatus(ReviewStatus.UNDER_APPEAL);
        return AppealDto.from(appeal);
    }

    @Transactional(readOnly = true)
    public List<AppealDto> findByStatus(AppealStatus status) {
        return appealRepository.findByStatusOrderByCreatedAtAsc(status).stream()
                .map(AppealDto::from)
                .toList();
    }

    @Transactional
    public AppealDto decide(Long appealId, ModerationDecisionRequest request, Long moderatorId) {
        Appeal appeal = appealRepository.findById(appealId)
                .orElseThrow(() -> new NotFoundException("Заявка не найдена"));
        if (appeal.getStatus() != AppealStatus.PENDING) {
            throw new BusinessRuleException("Заявка уже рассмотрена");
        }

        Review review = appeal.getReview();
        boolean approved = request.decision() == ModerationDecisionRequest.Decision.APPROVE;

        appeal.setStatus(approved ? AppealStatus.APPROVED : AppealStatus.REJECTED);
        appeal.setModerator(getUser(moderatorId));
        appeal.setModeratorComment(request.comment());
        appeal.setResolvedAt(LocalDateTime.now());

        review.setStatus(approved ? ReviewStatus.HIDDEN : ReviewStatus.PUBLISHED);
        // Скрытый отзыв не должен влиять на оценку компании — пересчитываем сразу
        if (approved) {
            reviewRepository.save(review);
            ratingService.recalculate(review.getCompany());
        }
        return AppealDto.from(appeal);
    }

    private User getUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new NotFoundException("Пользователь не найден"));
    }
}
