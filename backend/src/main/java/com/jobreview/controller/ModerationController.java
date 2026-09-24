package com.jobreview.controller;

import com.jobreview.config.OpenApiConfig;
import com.jobreview.dto.AppealDto;
import com.jobreview.dto.AssignRepresentativeRequest;
import com.jobreview.dto.ModerationDecisionRequest;
import com.jobreview.dto.UserDto;
import com.jobreview.exception.ApiError;
import com.jobreview.model.AppealStatus;
import com.jobreview.security.UserPrincipal;
import com.jobreview.service.AppealService;
import com.jobreview.service.UserService;
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
 * Рабочее место модератора. Доступ ограничен дважды: правилом в SecurityConfig
 * и аннотацией @PreAuthorize — если кто-то поменяет URL-правила, защита не пропадёт.
 */
@RestController
@RequestMapping("/api/moderation")
@PreAuthorize("hasRole('MODERATOR')")
@Tag(name = "Модерация", description = "Рассмотрение обжалований и подтверждение представителей компаний")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class ModerationController {

    private final AppealService appealService;
    private final UserService userService;

    public ModerationController(AppealService appealService, UserService userService) {
        this.appealService = appealService;
        this.userService = userService;
    }

    @GetMapping("/appeals")
    @Operation(summary = "Очередь заявок", description = "По умолчанию — заявки на рассмотрении, самые старые первыми.")
    @ApiResponse(responseCode = "200", description = "Список заявок")
    @ApiResponse(responseCode = "403", description = "Нет роли MODERATOR")
    public List<AppealDto> appeals(@Parameter(description = "Статус заявок") @RequestParam(defaultValue = "PENDING") AppealStatus status) {
        return appealService.findByStatus(status);
    }

    @PostMapping("/appeals/{appealId}/decision")
    @Operation(summary = "Решение по заявке", description = "APPROVE скрывает отзыв и пересчитывает рейтинг компании, REJECT возвращает отзыв в обычный статус.")
    @ApiResponse(responseCode = "200", description = "Решение сохранено")
    @ApiResponse(responseCode = "404", description = "Заявка не найдена", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "Заявка уже рассмотрена", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public AppealDto decide(@PathVariable Long appealId,
                            @Valid @RequestBody ModerationDecisionRequest request,
                            @AuthenticationPrincipal UserPrincipal principal) {
        return appealService.decide(appealId, request, principal.getId());
    }

    @PutMapping("/users/{userId}/representative")
    @Operation(summary = "Назначить представителя компании",
            description = "После проверки документов пользователь получает роль REPRESENTATIVE и значок Verified. "
                    + "Изменение роли вступит в силу после повторного входа пользователя (роль хранится в JWT).")
    @ApiResponse(responseCode = "200", description = "Пользователь назначен")
    @ApiResponse(responseCode = "409", description = "У компании уже есть представитель", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public UserDto assignRepresentative(@PathVariable Long userId, @Valid @RequestBody AssignRepresentativeRequest request) {
        return userService.assignRepresentative(userId, request);
    }
}
