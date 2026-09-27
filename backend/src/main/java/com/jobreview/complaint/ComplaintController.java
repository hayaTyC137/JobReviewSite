package com.jobreview.complaint;

import com.jobreview.common.error.ApiError;
import com.jobreview.common.ratelimit.RateLimiter;
import com.jobreview.common.web.ModerationDecisionRequest;
import com.jobreview.config.OpenApiConfig;
import com.jobreview.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Жалобы", description = "Жалобы на отзывы, оценки, пользователей и компании; арбитраж модератором")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class ComplaintController {

    private final ComplaintService service;
    private final RateLimiter rateLimiter;

    public ComplaintController(ComplaintService service, RateLimiter rateLimiter) {
        this.service = service;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/api/complaints")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Пожаловаться")
    @ApiResponse(responseCode = "409", description = "Жалоба уже на рассмотрении", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "429", description = "Слишком много жалоб подряд", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public ComplaintDtos.ComplaintView create(@Valid @RequestBody ComplaintDtos.CreateComplaint request,
                                              @AuthenticationPrincipal UserPrincipal principal) {
        rateLimiter.check("complaint:" + principal.getId(), 10, Duration.ofHours(1),
                "Слишком много жалоб подряд. Попробуйте позже.");
        return service.create(request, principal.getId());
    }

    @GetMapping("/api/complaints/mine")
    @Operation(summary = "Мои жалобы и их статус")
    public List<ComplaintDtos.ComplaintView> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return service.mine(principal.getId());
    }

    @GetMapping("/api/moderation/complaints")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    @Operation(summary = "Центр жалоб: очередь", tags = "Модерация")
    public List<ComplaintDtos.ComplaintView> queue(@RequestParam(defaultValue = "OPEN") Complaint.Status status) {
        return service.queue(status);
    }

    @PostMapping("/api/moderation/complaints/{id}/decision")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    @Operation(summary = "Решение по жалобе", tags = "Модерация",
            description = "APPROVE — жалоба обоснована: отзыв/оценка скрывается, пользователю добавляется дисциплинарная запись. "
                    + "REJECT — оставить как есть.")
    public ComplaintDtos.ComplaintView decide(@PathVariable Long id, @Valid @RequestBody ModerationDecisionRequest request,
                                              @AuthenticationPrincipal UserPrincipal principal) {
        return service.decide(id, request, principal.getId());
    }
}
