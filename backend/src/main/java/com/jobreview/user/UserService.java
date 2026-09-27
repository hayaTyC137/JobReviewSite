package com.jobreview.user;

import com.jobreview.common.error.NotFoundException;
import com.jobreview.review.Review;
import com.jobreview.review.ReviewRepository;
import com.jobreview.review.ReviewStatus;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Публичные карточки авторов отзывов.
 */
@Service
public class UserService {

    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final CandidateRatingCalculator ratingCalculator;

    public UserService(UserRepository userRepository, ReviewRepository reviewRepository,
                       CandidateRatingCalculator ratingCalculator) {
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
        this.ratingCalculator = ratingCalculator;
    }

    @Transactional(readOnly = true)
    public AuthorCardDto getAuthorCard(Long userId) {
        User user = getUser(userId);

        long published = reviewRepository.countByAuthorIdAndStatusNot(userId, ReviewStatus.HIDDEN);
        long hidden = reviewRepository.countByAuthorIdAndStatus(userId, ReviewStatus.HIDDEN);
        long companies = reviewRepository.countDistinctCompaniesByAuthor(userId, ReviewStatus.HIDDEN);

        // Если должность в профиле не указана, подставляем должность из последнего отзыва
        String jobTitle = user.getJobTitle();
        if (jobTitle == null || jobTitle.isBlank()) {
            jobTitle = reviewRepository.findFirstByAuthorIdOrderByCreatedAtDesc(userId)
                    .map(Review::getPosition)
                    .orElse(null);
        }

        LocalDate memberSince = user.getCreatedAt().toLocalDate();
        CandidateRatingDto rating = ratingCalculator.calculate(new CandidateRatingCalculator.Input(
                published, hidden, companies, memberSince, LocalDate.now(),
                user.getJobTitle() != null && !user.getJobTitle().isBlank(),
                user.getCity() != null && !user.getCity().isBlank()));

        boolean verifiedRepresentative = user.isVerifiedRepresentative();
        String representedCompany = verifiedRepresentative ? user.getCompany().getName() : null;

        return new AuthorCardDto(user.getId(), user.getDisplayName(), jobTitle, user.getCity(), user.getAvatarUrl(),
                memberSince, published, companies, verifiedRepresentative, representedCompany, rating);
    }

    @Transactional(readOnly = true)
    public User getUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new NotFoundException("Пользователь не найден"));
    }
}
