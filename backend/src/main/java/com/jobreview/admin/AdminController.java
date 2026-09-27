package com.jobreview.admin;

import com.jobreview.analytics.PlatformAnalyticsDtos;
import com.jobreview.analytics.PlatformAnalyticsService;
import com.jobreview.common.error.ApiError;
import com.jobreview.common.web.PageResponse;
import com.jobreview.company.CompanyModerationService;
import com.jobreview.company.CompanyProfileDto;
import com.jobreview.company.CompanyStatus;
import com.jobreview.config.OpenApiConfig;
import com.jobreview.review.ReviewStatus;
import com.jobreview.security.UserPrincipal;
import com.jobreview.settings.SettingDto;
import com.jobreview.settings.SettingsService;
import com.jobreview.user.Role;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Панель администратора. Доступ — только роль ADMIN (правило в SecurityConfig + @PreAuthorize).
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@Validated
@Tag(name = "Администрирование", description = "Дашборд, пользователи и роли, контент, системные настройки")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class AdminController {

    private final AdminService adminService;
    private final PlatformAnalyticsService analyticsService;
    private final CompanyModerationService companyModeration;
    private final SettingsService settingsService;

    public AdminController(AdminService adminService, PlatformAnalyticsService analyticsService,
                           CompanyModerationService companyModeration, SettingsService settingsService) {
        this.adminService = adminService;
        this.analyticsService = analyticsService;
        this.companyModeration = companyModeration;
        this.settingsService = settingsService;
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Сквозная аналитика", description = "Пользователи, компании, отзывы, очереди, динамика за 12 месяцев и нагрузка API за час.")
    public PlatformAnalyticsDtos.Dashboard dashboard() {
        return analyticsService.dashboard();
    }

    // ---------- Пользователи ----------

    @GetMapping("/users")
    @Operation(summary = "Пользователи", description = "Поиск по email и имени, фильтры по роли и блокировке.")
    public PageResponse<AdminDtos.AdminUser> users(@RequestParam(required = false) String q,
                                                   @RequestParam(required = false) Role role,
                                                   @RequestParam(required = false) Boolean blocked,
                                                   @RequestParam(defaultValue = "0") @Min(0) int page,
                                                   @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return adminService.users(q, role, blocked, page, size);
    }

    @PutMapping("/users/{userId}/role")
    @Operation(summary = "Сменить роль", description = "Действует сразу, без повторного входа пользователя.")
    @ApiResponse(responseCode = "409", description = "Попытка изменить собственную роль", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public AdminDtos.AdminUser changeRole(@PathVariable Long userId, @Valid @RequestBody AdminDtos.ChangeRole request,
                                          @AuthenticationPrincipal UserPrincipal principal) {
        return adminService.changeRole(principal.getId(), userId, request);
    }

    @PutMapping("/users/{userId}/block")
    @Operation(summary = "Заблокировать или разблокировать", description = "Выданные пользователю токены перестают работать сразу.")
    public AdminDtos.AdminUser changeBlock(@PathVariable Long userId, @Valid @RequestBody AdminDtos.ChangeBlock request,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return adminService.changeBlock(principal.getId(), userId, request);
    }

    // ---------- Контент ----------

    @GetMapping("/reviews")
    @Operation(summary = "Реестр отзывов", description = "Все отзывы, включая скрытые.")
    public PageResponse<AdminDtos.AdminReview> reviews(@RequestParam(required = false) String q,
                                                       @RequestParam(required = false) ReviewStatus status,
                                                       @RequestParam(defaultValue = "0") @Min(0) int page,
                                                       @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return adminService.reviews(q, status, page, size);
    }

    @PutMapping("/reviews/{reviewId}/status")
    @Operation(summary = "Скрыть или вернуть отзыв", description = "Рейтинг компании пересчитывается сразу.")
    public AdminDtos.AdminReview changeReviewStatus(@PathVariable Long reviewId,
                                                    @Valid @RequestBody AdminDtos.ChangeReviewStatus request) {
        return adminService.changeReviewStatus(reviewId, request.status());
    }

    @GetMapping("/companies")
    @Operation(summary = "Реестр компаний", description = "Все компании с любым статусом.")
    public PageResponse<CompanyProfileDto> companies(@RequestParam(required = false) String q,
                                                     @RequestParam(required = false) CompanyStatus status,
                                                     @RequestParam(defaultValue = "0") @Min(0) int page,
                                                     @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return adminService.companies(q, status, page, size);
    }

    @PutMapping("/companies/{companyId}/status")
    @Operation(summary = "Сменить статус компании", description = "Опубликовать, приостановить или вернуть на проверку.")
    public CompanyProfileDto changeCompanyStatus(@PathVariable Long companyId,
                                                 @Valid @RequestBody AdminDtos.ChangeCompanyStatus request) {
        return companyModeration.changeStatus(companyId, request.status(), request.comment());
    }

    // ---------- Настройки ----------

    @GetMapping("/settings")
    @Operation(summary = "Системные настройки")
    public List<SettingDto> settings() {
        return settingsService.list();
    }

    @PutMapping("/settings/{key}")
    @Operation(summary = "Изменить настройку", description = "Значение проверяется: например, лимит отзывов — целое от 1 до 50.")
    public SettingDto changeSetting(@PathVariable String key, @Valid @RequestBody AdminDtos.ChangeSetting request,
                                    @AuthenticationPrincipal UserPrincipal principal) {
        return settingsService.update(key, request.value(), principal.getId());
    }
}
