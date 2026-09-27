package com.jobreview.analytics;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Статистика", description = "Открытые цифры платформы")
public class PublicStatsController {

    private final PlatformAnalyticsService analyticsService;

    public PublicStatsController(PlatformAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/api/stats")
    @Operation(summary = "Платформа в цифрах", description = "Компании, отзывы, пользователи, география и разобранные споры.")
    public PlatformAnalyticsDtos.PublicStats stats() {
        return analyticsService.publicStats();
    }
}
