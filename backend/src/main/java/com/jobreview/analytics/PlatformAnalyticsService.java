package com.jobreview.analytics;

import com.jobreview.appeal.AppealRepository;
import com.jobreview.appeal.AppealStatus;
import com.jobreview.company.Company;
import com.jobreview.company.CompanyRepository;
import com.jobreview.company.CompanyStatus;
import com.jobreview.complaint.Complaint;
import com.jobreview.complaint.ComplaintRepository;
import com.jobreview.employee.DisciplinaryRecord;
import com.jobreview.employee.DisciplinaryRecordRepository;
import com.jobreview.location.LocationService;
import com.jobreview.location.LocationsDto;
import com.jobreview.profile.ProfileChangeRequest;
import com.jobreview.profile.ProfileChangeRequestRepository;
import com.jobreview.review.ReviewRepository;
import com.jobreview.review.ReviewStatus;
import com.jobreview.support.SupportTicket;
import com.jobreview.support.SupportTicketRepository;
import com.jobreview.user.Role;
import com.jobreview.user.UserRepository;
import java.lang.management.ManagementFactory;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Аналитика платформы: открытые цифры для главной и сквозной дашборд администратора.
 *
 * Помесячная динамика строится в Java по датам создания за последний год — на объёмах платформы
 * это дешевле и понятнее, чем специфичные для СУБД GROUP BY по месяцам (которые различаются в PostgreSQL и H2).
 */
@Service
@Transactional(readOnly = true)
public class PlatformAnalyticsService {

    private static final int MONTHS = 12;

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final ReviewRepository reviewRepository;
    private final ComplaintRepository complaintRepository;
    private final AppealRepository appealRepository;
    private final SupportTicketRepository ticketRepository;
    private final ProfileChangeRequestRepository profileChangeRepository;
    private final DisciplinaryRecordRepository disciplineRepository;
    private final LocationService locationService;
    private final RequestMetrics requestMetrics;

    public PlatformAnalyticsService(UserRepository userRepository, CompanyRepository companyRepository,
                                    ReviewRepository reviewRepository, ComplaintRepository complaintRepository,
                                    AppealRepository appealRepository, SupportTicketRepository ticketRepository,
                                    ProfileChangeRequestRepository profileChangeRepository,
                                    DisciplinaryRecordRepository disciplineRepository, LocationService locationService,
                                    RequestMetrics requestMetrics) {
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.reviewRepository = reviewRepository;
        this.complaintRepository = complaintRepository;
        this.appealRepository = appealRepository;
        this.ticketRepository = ticketRepository;
        this.profileChangeRepository = profileChangeRepository;
        this.disciplineRepository = disciplineRepository;
        this.locationService = locationService;
        this.requestMetrics = requestMetrics;
    }

    public PlatformAnalyticsDtos.PublicStats publicStats() {
        LocationsDto locations = locationService.getLocations();
        List<LocationsDto.City> withCompanies = locations.cities().stream().filter(c -> c.companiesCount() > 0).toList();
        long visibleReviews = reviewRepository.countByStatus(ReviewStatus.PUBLISHED)
                + reviewRepository.countByStatus(ReviewStatus.UNDER_APPEAL);
        Double average = reviewRepository.averageVisibleRating();
        long resolvedDisputes = complaintRepository.count() - complaintRepository.countByStatus(Complaint.Status.OPEN)
                + appealRepository.count() - appealRepository.countByStatus(AppealStatus.PENDING);

        return new PlatformAnalyticsDtos.PublicStats(
                companyRepository.countByStatus(CompanyStatus.APPROVED),
                visibleReviews,
                userRepository.count(),
                average == null ? null : Math.round(average * 10) / 10.0,
                withCompanies.stream().map(LocationsDto.City::country).distinct().count(),
                withCompanies.size(),
                reviewRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(30)),
                userRepository.countCompaniesWithVerifiedRepresentative(),
                resolvedDisputes);
    }

    public PlatformAnalyticsDtos.Dashboard dashboard() {
        LocalDateTime now = LocalDateTime.now();
        var totals = new PlatformAnalyticsDtos.Totals(
                userRepository.count(),
                userRepository.countByBlockedTrue(),
                userRepository.countByRole(Role.REPRESENTATIVE),
                userRepository.countByRole(Role.MODERATOR),
                userRepository.countByRole(Role.ADMIN),
                userRepository.countByLastLoginAtAfter(now.minusHours(24)),
                companyRepository.countByStatus(CompanyStatus.APPROVED),
                companyRepository.countByStatus(CompanyStatus.PENDING),
                companyRepository.countByStatus(CompanyStatus.SUSPENDED),
                reviewRepository.countByStatus(ReviewStatus.PUBLISHED),
                reviewRepository.countByStatus(ReviewStatus.UNDER_APPEAL),
                reviewRepository.countByStatus(ReviewStatus.HIDDEN),
                complaintRepository.countByStatus(Complaint.Status.OPEN),
                ticketRepository.countByStatusIn(EnumSet.of(SupportTicket.Status.NEW, SupportTicket.Status.IN_PROGRESS)),
                appealRepository.countByStatus(AppealStatus.PENDING),
                profileChangeRepository.countByStatus(ProfileChangeRequest.Status.PENDING),
                disciplineRepository.countByStatus(DisciplinaryRecord.Status.PENDING));

        return new PlatformAnalyticsDtos.Dashboard(totals, monthly(now), topCompanies(now), load());
    }

    private List<PlatformAnalyticsDtos.MonthPoint> monthly(LocalDateTime now) {
        YearMonth current = YearMonth.from(now);
        LocalDateTime from = current.minusMonths(MONTHS - 1L).atDay(1).atStartOfDay();
        Map<YearMonth, Long> users = byMonth(userRepository.findCreatedAtSince(from));
        Map<YearMonth, Long> reviews = byMonth(reviewRepository.findCreatedAtSince(from));
        Map<YearMonth, Long> companies = byMonth(companyRepository.findCreatedAtSince(from));

        List<PlatformAnalyticsDtos.MonthPoint> points = new ArrayList<>();
        for (int i = MONTHS - 1; i >= 0; i--) {
            YearMonth month = current.minusMonths(i);
            points.add(new PlatformAnalyticsDtos.MonthPoint(month.toString(), users.getOrDefault(month, 0L),
                    reviews.getOrDefault(month, 0L), companies.getOrDefault(month, 0L)));
        }
        return points;
    }

    private List<PlatformAnalyticsDtos.ActiveCompany> topCompanies(LocalDateTime now) {
        List<ReviewRepository.CompanyActivity> activity =
                reviewRepository.findMostActiveCompanies(now.minusDays(90), PageRequest.of(0, 5));
        Map<Long, Company> companies = companyRepository
                .findAllById(activity.stream().map(ReviewRepository.CompanyActivity::getCompanyId).toList())
                .stream().collect(Collectors.toMap(Company::getId, Function.identity()));
        return activity.stream()
                .filter(a -> companies.containsKey(a.getCompanyId()))
                .map(a -> {
                    Company c = companies.get(a.getCompanyId());
                    return new PlatformAnalyticsDtos.ActiveCompany(c.getSlug(), c.getName(), a.getReviews(),
                            c.getRating().getOverall());
                })
                .toList();
    }

    private PlatformAnalyticsDtos.Load load() {
        RequestMetrics.Snapshot snapshot = requestMetrics.snapshot();
        Runtime runtime = Runtime.getRuntime();
        long mb = 1024L * 1024L;
        return new PlatformAnalyticsDtos.Load(
                ManagementFactory.getRuntimeMXBean().getUptime() / 1000,
                (runtime.totalMemory() - runtime.freeMemory()) / mb,
                runtime.maxMemory() / mb,
                snapshot.requestsLastHour(),
                snapshot.errorsLastHour(),
                snapshot.averageLatencyMs(),
                snapshot.requestsPerMinute());
    }

    private static Map<YearMonth, Long> byMonth(List<LocalDateTime> dates) {
        return dates.stream().collect(Collectors.groupingBy(YearMonth::from, Collectors.counting()));
    }
}
