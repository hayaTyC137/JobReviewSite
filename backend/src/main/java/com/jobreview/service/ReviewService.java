package com.jobreview.service;

import com.jobreview.dto.CreateReviewRequest;
import com.jobreview.dto.PageResponse;
import com.jobreview.dto.ReviewDto;
import com.jobreview.exception.AccessDeniedOperationException;
import com.jobreview.exception.NotFoundException;
import com.jobreview.model.Appeal;
import com.jobreview.model.AppealStatus;
import com.jobreview.model.Company;
import com.jobreview.model.Review;
import com.jobreview.model.ReviewStatus;
import com.jobreview.model.User;
import com.jobreview.repository.AppealRepository;
import com.jobreview.repository.ReviewRepository;
import com.jobreview.repository.UserRepository;
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

    private final ReviewRepository reviewRepository;
    private final AppealRepository appealRepository;
    private final UserRepository userRepository;
    private final CompanyService companyService;
    private final CompanyRatingService ratingService;

    public ReviewService(ReviewRepository reviewRepository, AppealRepository appealRepository,
                         UserRepository userRepository, CompanyService companyService,
                         CompanyRatingService ratingService) {
        this.reviewRepository = reviewRepository;
        this.appealRepository = appealRepository;
        this.userRepository = userRepository;
        this.companyService = companyService;
        this.ratingService = ratingService;
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewDto> listForCompany(String slug, int page, int size) {
        Company company = companyService.findBySlug(slug);
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
        Company company = companyService.findBySlug(slug);
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new NotFoundException("Пользователь не найден"));

        // Руководитель не может оценивать собственную компанию — это конфликт интересов
        if (author.isVerifiedRepresentativeOf(company)) {
            throw new AccessDeniedOperationException("Представитель компании не может оставлять отзыв о ней");
        }

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
}
