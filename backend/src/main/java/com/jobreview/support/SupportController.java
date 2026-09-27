package com.jobreview.support;

import com.jobreview.common.error.ApiError;
import com.jobreview.common.ratelimit.RateLimiter;
import com.jobreview.common.web.ClientIp;
import com.jobreview.config.OpenApiConfig;
import com.jobreview.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Поддержка", description = "Страница «Связаться с нами»: обращения и их статус")
public class SupportController {

    private final SupportService service;
    private final RateLimiter rateLimiter;

    public SupportController(SupportService service, RateLimiter rateLimiter) {
        this.service = service;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/api/support/tickets")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Отправить обращение", description = "Доступно и гостям. Авторизованный пользователь потом видит статус в кабинете.")
    @ApiResponse(responseCode = "429", description = "Слишком много обращений с одного адреса", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public SupportDtos.TicketView create(@Valid @RequestBody SupportDtos.CreateTicket request,
                                         @AuthenticationPrincipal UserPrincipal principal, HttpServletRequest http) {
        String key = principal != null ? "ticket-user:" + principal.getId() : "ticket-ip:" + ClientIp.of(http);
        rateLimiter.check(key, 5, Duration.ofHours(1), "Слишком много обращений подряд. Мы ответим на уже отправленные.");
        return service.create(request, principal == null ? null : principal.getId());
    }

    @GetMapping("/api/support/tickets/mine")
    @SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
    @Operation(summary = "Мои обращения и их статус")
    public List<SupportDtos.TicketView> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return service.mine(principal.getId());
    }

    @GetMapping("/api/moderation/tickets")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    @SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
    @Operation(summary = "Обращения пользователей", tags = "Модерация")
    public List<SupportDtos.TicketView> queue(@RequestParam(defaultValue = "true") boolean onlyOpen) {
        return service.queue(onlyOpen);
    }

    @PutMapping("/api/moderation/tickets/{id}")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    @SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
    @Operation(summary = "Ответить на обращение и сменить статус", tags = "Модерация")
    public SupportDtos.TicketView update(@PathVariable Long id, @Valid @RequestBody SupportDtos.UpdateTicket request,
                                         @AuthenticationPrincipal UserPrincipal principal) {
        return service.update(id, request, principal.getId());
    }
}
