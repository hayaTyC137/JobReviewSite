package com.jobreview.review;

import com.jobreview.appeal.Appeal;
import com.jobreview.appeal.AppealRepository;
import com.jobreview.appeal.AppealStatus;
import com.jobreview.common.error.AccessDeniedOperationException;
import com.jobreview.common.error.BusinessRuleException;
import com.jobreview.common.error.NotFoundException;
import com.jobreview.common.error.TooManyRequestsException;
import com.jobreview.common.web.PageResponse;
import com.jobreview.company.Company;
import com.jobreview.company.CompanyRatingService;
import com.jobreview.company.CompanyService;
import com.jobreview.settings.SettingKey;
import com.jobreview.settings.SettingsService;
import com.jobreview.user.User;
import com.jobreview.user.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Лента отзывов компании и публикация новых отзывов.
 */
@Service
public class ReviewService {

    /** Повторный отзыв об одной и той же компании — не чаще раза в квартал */
    static final int REPEAT_REVIEW_COOLDOWN_DAYS = 90;

    private final ReviewRepository reviewRepository;
    private final AppealRepository appealRepository;
    private final UserRepository userRepository;
    private final CompanyService companyService;
    private final CompanyRatingService ratingService;
    private final SettingsService settingsService;

    public ReviewService(ReviewRepository reviewRepository, AppealRepository appealRepository,
                         UserRepository userRepository, CompanyService companyService,
                         CompanyRatingService ratingService, SettingsService settingsService) {
        this.reviewRepository = reviewRepository;
        this.appealRepository = appealRepository;
        this.userRepository = userRepository;
        this.companyService = companyService;
        this.ratingService = ratingService;
        this.settingsService = settingsService;
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewDto> listForCompany(String slug, int page, int size) {
        Company company = companyService.findPublishedBySlug(slug);
        Page<Review> reviews = reviewRepository.findByCompanyIdAndStatusNotOrderByCreatedAtDesc(
                company.getId(), ReviewStatus.HIDDEN, PageRequest.of(page, size));

        // Открытые жалобы на отзывы этой страницы — одним запросом, затем раскладываем по id отзыва
        List<Long> reviewIds = reviews.getContent().stream().map(Review::getId).toList();
        Map<Long, Appeal> pendingByReview = appealRepository
                .findByReviewIdInAndStatus(reviewIds, AppealStatus.PENDING).stream()
                .collect(Collectors.toMap(a -> a.getReview().getId(), Function.identity(), (a, b) -> a));

        return PageResponse.from(reviews.map(r -> ReviewDto.from(r, pendingByReview.get(r.getId()))));
    }

    @Transactional
    public ReviewDto create(String slug, CreateReviewRequest request, Long authorId) {
        Company company = companyService.findPublishedBySlug(slug);
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new NotFoundException("Пользователь не найден"));

        checkReviewAllowed(author, company, request.text().trim());

        Review review = new Review();
        review.setCompany(company);
        review.setAuthor(author);
        review.setEmploymentStatus(request.employmentStatus());
        review.setPosition(request.position().trim());
        review.setOverallRating(request.overall());
        review.setScores(request.scores().toEntity());
        review.setText(request.text().trim());
        review.setStatus(ReviewStatus.PUBLISHED);
        reviewRepository.save(review);

        ratingService.recalculate(company);
        return ReviewDto.from(review, null);
    }

    /**
     * Правила против накруток и конфликта интересов. Каждое нарушение — понятное сообщение для автора.
     */
    private void checkReviewAllowed(User author, Company company, String text) {
        // Руководитель или HR не может оценивать собственную компанию (даже пока его статус проверяется)
        if (author.getCompany() != null && author.getCompany().getId().equals(company.getId())) {
            throw new AccessDeniedOperationException("Представитель компании не может оставлять отзыв о ней");
        }
        // Модераторы и администраторы разбирают споры об отзывах — сами их не пишут
        if (author.getRole().isStaff()) {
            throw new AccessDeniedOperationException("Сотрудники платформы не публикуют отзывы, чтобы оставаться нейтральными");
        }
        LocalDateTime now = LocalDateTime.now();
        if (reviewRepository.existsByAuthorIdAndCompanyIdAndCreatedAtAfter(author.getId(), company.getId(),
                now.minusDays(REPEAT_REVIEW_COOLDOWN_DAYS))) {
            throw new BusinessRuleException("Вы уже оставляли отзыв об этой компании за последние "
                    + REPEAT_REVIEW_COOLDOWN_DAYS + " дней");
        }
        int dailyLimit = settingsService.getInt(SettingKey.REVIEWS_DAILY_LIMIT);
        if (reviewRepository.countByAuthorIdAndCreatedAtAfter(author.getId(), now.minusHours(24)) >= dailyLimit) {
            throw new TooManyRequestsException("Не больше " + dailyLimit + " отзывов в сутки. Продолжите завтра.");
        }
        if (reviewRepository.existsByAuthorIdAndText(author.getId(), text)) {
            throw new BusinessRuleException("Такой же текст отзыва уже опубликован — опишите опыт в этой компании");
        }
    }
}
