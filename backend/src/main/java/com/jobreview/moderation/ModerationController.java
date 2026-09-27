package com.jobreview.moderation;

import com.jobreview.appeal.AppealDto;
import com.jobreview.appeal.AppealService;
import com.jobreview.appeal.AppealStatus;
import com.jobreview.common.error.ApiError;
import com.jobreview.common.web.ModerationDecisionRequest;
import com.jobreview.company.CompanyModerationService;
import com.jobreview.company.CompanyProfileDto;
import com.jobreview.company.CompanyStatus;
import com.jobreview.config.OpenApiConfig;
import com.jobreview.security.UserPrincipal;
import com.jobreview.user.UserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Рабочее место модератора: сводка очередей, обжалования отзывов, реестр новых компаний
 * и подтверждение представителей. Остальные очереди (жалобы, дисциплина, смена данных профиля,
 * обращения) живут в своих модулях под тем же префиксом /api/moderation.
 *
 * Доступ ограничен дважды: правилом в SecurityConfig и аннотацией @PreAuthorize.
 */
@RestController
@RequestMapping("/api/moderation")
@PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
@Tag(name = "Модерация", description = "Очереди модерации")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class ModerationController {

    private final ModerationSummaryService summaryService;
    private final AppealService appealService;
    private final CompanyModerationService companyModeration;

    public ModerationController(ModerationSummaryService summaryService, AppealService appealService,
                                CompanyModerationService companyModeration) {
        this.summaryService = summaryService;
        this.appealService = appealService;
        this.companyModeration = companyModeration;
    }

    @GetMapping("/summary")
    @Operation(summary = "Сводка очередей", description = "Сколько заявок ждёт решения в каждой очереди — для мониторинга.")
    public ModerationSummaryService.Summary summary() {
        return summaryService.summary();
    }

    // ---------- Обжалования отзывов ----------

    @GetMapping("/appeals")
    @Operation(summary = "Очередь обжалований", description = "По умолчанию — заявки на рассмотрении, самые старые первыми.")
    @ApiResponse(responseCode = "403", description = "Нет роли MODERATOR или ADMIN")
    public List<AppealDto> appeals(@Parameter(description = "Статус заявок") @RequestParam(defaultValue = "PENDING") AppealStatus status) {
        return appealService.findByStatus(status);
    }

    @PostMapping("/appeals/{appealId}/decision")
    @Operation(summary = "Решение по обжалованию", description = "APPROVE скрывает отзыв и пересчитывает рейтинг компании, REJECT возвращает отзыв в обычный статус.")
    @ApiResponse(responseCode = "404", description = "Заявка не найдена", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "Заявка уже рассмотрена", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public AppealDto decideAppeal(@PathVariable Long appealId, @Valid @RequestBody ModerationDecisionRequest request,
                                  @AuthenticationPrincipal UserPrincipal principal) {
        return appealService.decide(appealId, request, principal.getId());
    }

    // ---------- Реестр компаний ----------

    @GetMapping("/companies")
    @Operation(summary = "Заявки на добавление компаний")
    public List<CompanyProfileDto> companies(@RequestParam(defaultValue = "PENDING") CompanyStatus status) {
        return companyModeration.queue(status);
    }

    @PostMapping("/companies/{companyId}/decision")
    @Operation(summary = "Решение по заявке компании",
            description = "APPROVE публикует компанию в поиске и подтверждает заявителя как представителя. "
                    + "REJECT требует комментарий — представитель увидит причину и сможет исправить заявку.")
    public CompanyProfileDto decideCompany(@PathVariable Long companyId, @Valid @RequestBody ModerationDecisionRequest request,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return companyModeration.decide(companyId, request, principal.getId());
    }

    // ---------- Представители компаний ----------

    @GetMapping("/representatives")
    @Operation(summary = "Представители, ожидающие подтверждения")
    public List<CompanyModerationService.PendingRepresentative> representatives() {
        return companyModeration.pendingRepresentatives();
    }

    @PostMapping("/representatives/{userId}/decision")
    @Operation(summary = "Подтвердить или отклонить представителя")
    public CompanyModerationService.PendingRepresentative decideRepresentative(@PathVariable Long userId,
                                                                               @Valid @RequestBody ModerationDecisionRequest request) {
        return companyModeration.decideRepresentative(userId, request);
    }

    @PutMapping("/users/{userId}/representative")
    @Operation(summary = "Назначить представителя компании",
            description = "После проверки документов пользователь получает роль REPRESENTATIVE и значок Verified. "
                    + "Роль действует сразу: права проверяются по базе при каждом запросе.")
    public UserDto assignRepresentative(@PathVariable Long userId, @Valid @RequestBody AssignRepresentativeRequest request) {
        return UserDto.from(companyModeration.assignRepresentative(userId, request.companyId()));
    }
}
