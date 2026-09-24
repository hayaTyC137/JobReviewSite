package com.jobreview.service;

import com.jobreview.dto.AssignRepresentativeRequest;
import com.jobreview.dto.AuthorCardDto;
import com.jobreview.dto.CandidateRatingDto;
import com.jobreview.dto.UserDto;
import com.jobreview.exception.BusinessRuleException;
import com.jobreview.exception.NotFoundException;
import com.jobreview.model.Company;
import com.jobreview.model.Review;
import com.jobreview.model.ReviewStatus;
import com.jobreview.model.Role;
import com.jobreview.model.User;
import com.jobreview.repository.CompanyRepository;
import com.jobreview.repository.ReviewRepository;
import com.jobreview.repository.UserRepository;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Публичные карточки авторов и управление статусом представителя компании.
 */
@Service
public class UserService {

    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final CompanyRepository companyRepository;
    private final CandidateRatingCalculator ratingCalculator;

    public UserService(UserRepository userRepository, ReviewRepository reviewRepository,
                       CompanyRepository companyRepository, CandidateRatingCalculator ratingCalculator) {
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
        this.companyRepository = companyRepository;
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

        boolean verifiedRepresentative = user.getRole() == Role.REPRESENTATIVE && user.isRepresentativeVerified();
        String representedCompany = verifiedRepresentative && user.getCompany() != null ? user.getCompany().getName() : null;

        return new AuthorCardDto(user.getId(), user.getDisplayName(), jobTitle, user.getCity(), memberSince,
                published, companies, verifiedRepresentative, representedCompany, rating);
    }

    /**
     * Модератор после проверки документов назначает пользователя представителем компании.
     * У компании может быть только один подтверждённый представитель.
     */
    @Transactional
    public UserDto assignRepresentative(Long userId, AssignRepresentativeRequest request) {
        User user = getUser(userId);
        Company company = companyRepository.findById(request.companyId())
                .orElseThrow(() -> new NotFoundException("Компания не найдена"));

        userRepository.findFirstByCompanyIdAndRoleAndRepresentativeVerifiedTrue(company.getId(), Role.REPRESENTATIVE)
                .filter(existing -> !existing.getId().equals(userId))
                .ifPresent(existing -> {
                    throw new BusinessRuleException("У компании уже есть подтверждённый представитель: "
                            + existing.getDisplayName());
                });

        user.setRole(Role.REPRESENTATIVE);
        user.setCompany(company);
        user.setRepresentativeVerified(true);
        return UserDto.from(user);
    }

    private User getUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new NotFoundException("Пользователь не найден"));
    }
}
