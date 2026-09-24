package com.jobreview.service;

import com.jobreview.model.Company;
import com.jobreview.model.CompanyRating;
import com.jobreview.model.Review;
import com.jobreview.model.ReviewStatus;
import com.jobreview.repository.CompanyRepository;
import com.jobreview.repository.ReviewRepository;
import java.util.List;
import java.util.function.ToIntFunction;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Пересчитывает сводный рейтинг компании.
 * Вызывается каждый раз, когда меняется набор видимых отзывов:
 * новый отзыв, скрытие отзыва по жалобе, загрузка демо-данных.
 */
@Service
public class CompanyRatingService {

    private final ReviewRepository reviewRepository;
    private final CompanyRepository companyRepository;

    public CompanyRatingService(ReviewRepository reviewRepository, CompanyRepository companyRepository) {
        this.reviewRepository = reviewRepository;
        this.companyRepository = companyRepository;
    }

    @Transactional
    public void recalculate(Company company) {
        List<Review> reviews = reviewRepository.findByCompanyIdAndStatusNot(company.getId(), ReviewStatus.HIDDEN);

        CompanyRating rating = company.getRating();
        rating.setReviewsCount(reviews.size());
        rating.setOverall(average(reviews, Review::getOverallRating));
        rating.setClimate(average(reviews, r -> r.getScores().getClimate()));
        rating.setManagement(average(reviews, r -> r.getScores().getManagement()));
        rating.setTeam(average(reviews, r -> r.getScores().getTeam()));
        rating.setOffice(average(reviews, r -> r.getScores().getOffice()));
        rating.setClients(average(reviews, r -> r.getScores().getClients()));
        rating.setGrowth(average(reviews, r -> r.getScores().getGrowth()));

        companyRepository.save(company);
    }

    /**
     * Среднее с округлением до одного знака. Для пустого списка возвращаем null,
     * а не 0 — иначе компания без отзывов выглядела бы «самой плохой».
     */
    static Double average(List<Review> reviews, ToIntFunction<Review> field) {
        if (reviews.isEmpty()) {
            return null;
        }
        double avg = reviews.stream().mapToInt(field).average().orElse(0);
        return Math.round(avg * 10) / 10.0;
    }
}
