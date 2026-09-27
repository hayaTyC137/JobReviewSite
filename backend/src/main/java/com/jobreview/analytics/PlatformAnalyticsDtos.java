package com.jobreview.analytics;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

public final class PlatformAnalyticsDtos {

    private PlatformAnalyticsDtos() {
    }

    @Schema(description = "Открытая статистика платформы для главной страницы")
    public record PublicStats(
            @Schema(example = "14") long companies,
            @Schema(example = "212") long reviews,
            @Schema(example = "48") long users,
            @Schema(description = "Средняя оценка по всем видимым отзывам", example = "3.9") Double averageRating,
            @Schema(example = "4") long countries,
            @Schema(example = "11") long cities,
            @Schema(example = "37") long reviewsLast30Days,
            @Schema(description = "Компании с подтверждённым представителем", example = "6") long verifiedCompanies,
            @Schema(description = "Жалобы и обжалования, по которым модератор уже принял решение", example = "19") long resolvedDisputes
    ) {
    }

    @Schema(description = "Сквозная аналитика для администратора")
    public record Dashboard(Totals totals, List<MonthPoint> monthly, List<ActiveCompany> topCompanies, Load load) {
    }

    public record Totals(long users, long blockedUsers, long representatives, long moderators, long admins,
                         long loginsLast24h, long companiesApproved, long companiesPending, long companiesSuspended,
                         long reviewsPublished, long reviewsUnderAppeal, long reviewsHidden, long openComplaints,
                         long openTickets, long pendingAppeals, long pendingProfileChanges, long pendingDiscipline) {
    }

    public record MonthPoint(@Schema(example = "2026-08") String month, long newUsers, long newReviews, long newCompanies) {
    }

    public record ActiveCompany(String slug, String name, long reviewsLast90Days, Double rating) {
    }

    public record Load(long uptimeSeconds, long heapUsedMb, long heapMaxMb, long requestsLastHour, long errorsLastHour,
                       long averageLatencyMs, List<Long> requestsPerMinute) {
    }
}
