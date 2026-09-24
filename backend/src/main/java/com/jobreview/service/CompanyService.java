package com.jobreview.service;

import com.jobreview.dto.CompanyAnalyticsDto;
import com.jobreview.dto.CompanyAnalyticsDto.DistributionBucket;
import com.jobreview.dto.CompanyAnalyticsDto.MonthlyPoint;
import com.jobreview.dto.CompanyDetailsDto;
import com.jobreview.dto.CompanySearchFilter;
import com.jobreview.dto.CompanySummaryDto;
import com.jobreview.dto.CriteriaDto;
import com.jobreview.dto.LocationsDto;
import com.jobreview.dto.PageResponse;
import com.jobreview.dto.RepresentativeDto;
import com.jobreview.dto.ReviewPreviewDto;
import com.jobreview.exception.NotFoundException;
import com.jobreview.model.Company;
import com.jobreview.model.EmploymentStatus;
import com.jobreview.model.Review;
import com.jobreview.model.ReviewStatus;
import com.jobreview.model.Role;
import com.jobreview.repository.CompanyRepository;
import com.jobreview.repository.ReviewRepository;
import com.jobreview.repository.UserRepository;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Поиск компаний, детальная информация и аналитика оценок.
 */
@Service
@Transactional(readOnly = true)
public class CompanyService {

    private static final int TREND_MONTHS = 12;

    private final CompanyRepository companyRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;

    public CompanyService(CompanyRepository companyRepository, ReviewRepository reviewRepository,
                          UserRepository userRepository) {
        this.companyRepository = companyRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
    }

    public PageResponse<CompanySummaryDto> search(CompanySearchFilter filter) {
        PageRequest pageRequest = PageRequest.of(filter.pageOrDefault(), filter.sizeOrDefault(), toSort(filter.sortOrDefault()));
        Page<Company> companies = companyRepository.findAll(CompanySpecifications.matches(filter), pageRequest);

        // Для каждой компании на странице берём свежий отзыв отдельным запросом.
        // Страница маленькая (до 50 штук), поэтому такой подход проще и нагляднее, чем сложный JOIN.
        Page<CompanySummaryDto> result = companies.map(company -> {
            ReviewPreviewDto latest = reviewRepository
                    .findFirstByCompanyIdAndStatusNotOrderByCreatedAtDesc(company.getId(), ReviewStatus.HIDDEN)
                    .map(ReviewPreviewDto::from)
                    .orElse(null);
            return CompanySummaryDto.from(company, latest);
        });
        return PageResponse.from(result);
    }

    public CompanyDetailsDto getDetails(String slug) {
        Company company = findBySlug(slug);
        RepresentativeDto representative = userRepository
                .findFirstByCompanyIdAndRoleAndRepresentativeVerifiedTrue(company.getId(), Role.REPRESENTATIVE)
                .map(RepresentativeDto::from)
                .orElse(null);
        return CompanyDetailsDto.from(company, representative);
    }

    public LocationsDto getLocations() {
        List<CompanyRepository.LocationView> rows = companyRepository.findAllLocations();
        List<String> countries = rows.stream().map(CompanyRepository.LocationView::getCountry).distinct().toList();
        List<LocationsDto.City> cities = rows.stream()
                .map(row -> new LocationsDto.City(row.getCountry(), row.getCity()))
                .toList();
        return new LocationsDto(countries, cities);
    }

    /**
     * Аналитика считается на лету по видимым отзывам компании.
     * Отзывов у одной компании немного (десятки-сотни), так что это дёшево.
     */
    public CompanyAnalyticsDto getAnalytics(String slug) {
        Company company = findBySlug(slug);
        List<Review> reviews = reviewRepository.findByCompanyIdAndStatusNot(company.getId(), ReviewStatus.HIDDEN);

        List<Review> current = reviews.stream().filter(r -> r.getEmploymentStatus() == EmploymentStatus.CURRENT).toList();
        List<Review> former = reviews.stream().filter(r -> r.getEmploymentStatus() == EmploymentStatus.FORMER).toList();

        return new CompanyAnalyticsDto(
                buildMonthlyTrend(reviews),
                buildDistribution(reviews),
                averageCriteria(current),
                averageCriteria(former),
                current.size(),
                former.size());
    }

    Company findBySlug(String slug) {
        return companyRepository.findBySlug(slug)
                .orElseThrow(() -> new NotFoundException("Компания не найдена"));
    }

    private Sort toSort(CompanySearchFilter.CompanySort sort) {
        // Второй ключ сортировки по имени — чтобы порядок был стабильным при одинаковых оценках
        Sort byName = Sort.by("name");
        return switch (sort) {
            case RATING_DESC -> Sort.by(Sort.Order.desc("rating.overall").nullsLast()).and(byName);
            case RATING_ASC -> Sort.by(Sort.Order.asc("rating.overall").nullsLast()).and(byName);
            case REVIEWS_DESC -> Sort.by(Sort.Order.desc("rating.reviewsCount")).and(byName);
            case NAME_ASC -> byName;
        };
    }

    /**
     * Средняя оценка по месяцам. Окно из 12 месяцев заканчивается месяцем последнего отзыва,
     * чтобы у компаний, о которых давно не писали, график не был пустым.
     */
    private List<MonthlyPoint> buildMonthlyTrend(List<Review> reviews) {
        YearMonth lastMonth = reviews.stream()
                .map(r -> YearMonth.from(r.getCreatedAt()))
                .max(Comparator.naturalOrder())
                .orElse(YearMonth.now());

        List<MonthlyPoint> points = new ArrayList<>();
        for (int i = TREND_MONTHS - 1; i >= 0; i--) {
            YearMonth month = lastMonth.minusMonths(i);
            List<Review> inMonth = reviews.stream()
                    .filter(r -> YearMonth.from(r.getCreatedAt()).equals(month))
                    .toList();
            points.add(new MonthlyPoint(month.toString(),
                    CompanyRatingService.average(inMonth, Review::getOverallRating), inMonth.size()));
        }
        return points;
    }

    private List<DistributionBucket> buildDistribution(List<Review> reviews) {
        List<DistributionBucket> buckets = new ArrayList<>();
        for (int stars = 1; stars <= 5; stars++) {
            final int value = stars;
            int count = (int) reviews.stream().filter(r -> r.getOverallRating() == value).count();
            buckets.add(new DistributionBucket(stars, count));
        }
        return buckets;
    }

    private CriteriaDto averageCriteria(List<Review> reviews) {
        return new CriteriaDto(
                CompanyRatingService.average(reviews, r -> r.getScores().getClimate()),
                CompanyRatingService.average(reviews, r -> r.getScores().getManagement()),
                CompanyRatingService.average(reviews, r -> r.getScores().getTeam()),
                CompanyRatingService.average(reviews, r -> r.getScores().getOffice()),
                CompanyRatingService.average(reviews, r -> r.getScores().getClients()),
                CompanyRatingService.average(reviews, r -> r.getScores().getGrowth()));
    }
}
