package com.jobreview.controller;

import com.jobreview.config.OpenApiConfig;
import com.jobreview.dto.CompanyAnalyticsDto;
import com.jobreview.dto.CompanyDetailsDto;
import com.jobreview.dto.CompanySearchFilter;
import com.jobreview.dto.CompanySummaryDto;
import com.jobreview.dto.CreateReviewRequest;
import com.jobreview.dto.LocationsDto;
import com.jobreview.dto.PageResponse;
import com.jobreview.dto.ReviewDto;
import com.jobreview.exception.ApiError;
import com.jobreview.security.UserPrincipal;
import com.jobreview.service.CompanyService;
import com.jobreview.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Публичный каталог компаний: поиск, детальная страница, аналитика и отзывы.
 * Все GET-запросы доступны без входа, отправка отзыва — только с JWT.
 */
@RestController
@RequestMapping("/api/companies")
@Validated
@Tag(name = "Компании", description = "Поиск организаций, сведения, аналитика и отзывы")
public class CompanyController {

    private final CompanyService companyService;
    private final ReviewService reviewService;

    public CompanyController(CompanyService companyService, ReviewService reviewService) {
        this.companyService = companyService;
        this.reviewService = reviewService;
    }

    @GetMapping
    @Operation(summary = "Поиск компаний",
            description = "Поиск по названию, стране и городу, фильтры по минимальным суб-рейтингам (0 — фильтр выключен), "
                    + "сортировка по общей оценке. Каждая карточка содержит мини-рейтинги и самый свежий отзыв.")
    @ApiResponse(responseCode = "200", description = "Страница результатов")
    @ApiResponse(responseCode = "400", description = "Некорректные параметры фильтра", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public PageResponse<CompanySummaryDto> search(@Valid @ParameterObject CompanySearchFilter filter) {
        return companyService.search(filter);
    }

    @GetMapping("/locations")
    @Operation(summary = "Страны и города для фильтра", description = "Только те, где есть компании в каталоге.")
    public LocationsDto locations() {
        return companyService.getLocations();
    }

    @GetMapping("/{slug}")
    @Operation(summary = "Детальная информация о компании",
            description = "Юридические и фактические сведения, контакты, сводный рейтинг и подтверждённый представитель.")
    @ApiResponse(responseCode = "200", description = "Компания найдена")
    @ApiResponse(responseCode = "404", description = "Компании с таким slug нет", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public CompanyDetailsDto details(@Parameter(description = "Идентификатор компании в URL", example = "nova-studio")
                                     @PathVariable String slug) {
        return companyService.getDetails(slug);
    }

    @GetMapping("/{slug}/analytics")
    @Operation(summary = "Аналитика оценок",
            description = "Динамика средней оценки по месяцам, распределение звёзд и сравнение критериев "
                    + "у нынешних и бывших сотрудников.")
    @ApiResponse(responseCode = "200", description = "Аналитика")
    @ApiResponse(responseCode = "404", description = "Компания не найдена", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public CompanyAnalyticsDto analytics(@Parameter(example = "nova-studio") @PathVariable String slug) {
        return companyService.getAnalytics(slug);
    }

    @GetMapping("/{slug}/reviews")
    @Operation(summary = "Отзывы о компании",
            description = "Свежие сверху. Скрытые модератором отзывы не возвращаются; у обжалуемых заполнено pendingAppeal.")
    @ApiResponse(responseCode = "200", description = "Страница отзывов")
    @ApiResponse(responseCode = "404", description = "Компания не найдена", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public PageResponse<ReviewDto> reviews(@Parameter(example = "nova-studio") @PathVariable String slug,
                                           @RequestParam(defaultValue = "0") @Min(0) int page,
                                           @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size) {
        return reviewService.listForCompany(slug, page, size);
    }

    @PostMapping("/{slug}/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
    @Operation(summary = "Оставить отзыв", description = "Доступно только авторизованным пользователям. "
            + "Представитель компании не может оценивать собственную компанию.")
    @ApiResponse(responseCode = "201", description = "Отзыв опубликован, рейтинг компании пересчитан")
    @ApiResponse(responseCode = "400", description = "Ошибка валидации", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "401", description = "Нужна авторизация")
    @ApiResponse(responseCode = "403", description = "Конфликт интересов", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public ReviewDto createReview(@Parameter(example = "nova-studio") @PathVariable String slug,
                                  @Valid @RequestBody CreateReviewRequest request,
                                  @AuthenticationPrincipal UserPrincipal principal) {
        return reviewService.create(slug, request, principal.getId());
    }
}
