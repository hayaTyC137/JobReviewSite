package com.jobreview.controller;

import com.jobreview.config.OpenApiConfig;
import com.jobreview.dto.AppealDto;
import com.jobreview.dto.CreateAppealRequest;
import com.jobreview.exception.ApiError;
import com.jobreview.security.UserPrincipal;
import com.jobreview.service.AppealService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reviews")
@Tag(name = "Обжалование", description = "Заявки представителей компаний на пересмотр отзывов")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class AppealController {

    private final AppealService appealService;

    public AppealController(AppealService appealService) {
        this.appealService = appealService;
    }

    @PostMapping("/{reviewId}/appeals")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Обжаловать отзыв",
            description = "Только для подтверждённого представителя (роль REPRESENTATIVE) той компании, о которой отзыв. "
                    + "Отзыв остаётся видимым с пометкой «на проверке», пока модератор не примет решение.")
    @ApiResponse(responseCode = "201", description = "Заявка отправлена модераторам")
    @ApiResponse(responseCode = "401", description = "Нужна авторизация")
    @ApiResponse(responseCode = "403", description = "Пользователь не представитель этой компании", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "404", description = "Отзыв не найден", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "Заявка уже подана или отзыв скрыт", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public AppealDto create(@Parameter(description = "id отзыва", example = "1") @PathVariable Long reviewId,
                            @Valid @RequestBody CreateAppealRequest request,
                            @AuthenticationPrincipal UserPrincipal principal) {
        return appealService.create(reviewId, request, principal.getId());
    }
}
