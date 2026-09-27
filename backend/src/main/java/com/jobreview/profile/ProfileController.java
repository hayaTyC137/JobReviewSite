package com.jobreview.profile;

import com.jobreview.common.error.ApiError;
import com.jobreview.common.web.ModerationDecisionRequest;
import com.jobreview.config.OpenApiConfig;
import com.jobreview.security.UserPrincipal;
import com.jobreview.user.UserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Личный кабинет", description = "Профиль пользователя и заявки на смену критичных данных")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class ProfileController {

    private final ProfileService service;

    public ProfileController(ProfileService service) {
        this.service = service;
    }

    @PatchMapping("/api/me/profile")
    @Operation(summary = "Изменить профиль", description = "Аватар, должность, страна, город и «о себе» меняются сразу.")
    public UserDto update(@Valid @RequestBody ProfileDtos.UpdateProfile request, @AuthenticationPrincipal UserPrincipal principal) {
        return service.update(principal.getId(), request);
    }

    @PostMapping("/api/me/profile/change-requests")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Запросить смену критичных данных", description = "Публичное имя, ФИО и email меняются после проверки модератором.")
    @ApiResponse(responseCode = "409", description = "Заявка по этому полю уже на проверке", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public ProfileDtos.ChangeRequestView requestChange(@Valid @RequestBody ProfileDtos.CreateChangeRequest request,
                                                       @AuthenticationPrincipal UserPrincipal principal) {
        return service.requestChange(principal.getId(), request);
    }

    @GetMapping("/api/me/profile/change-requests")
    @Operation(summary = "Мои заявки на смену данных")
    public List<ProfileDtos.ChangeRequestView> myRequests(@AuthenticationPrincipal UserPrincipal principal) {
        return service.myRequests(principal.getId());
    }

    @GetMapping("/api/moderation/profile-changes")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    @Operation(summary = "Очередь заявок на смену данных", tags = "Модерация")
    public List<ProfileDtos.ChangeRequestView> queue(@RequestParam(defaultValue = "PENDING") ProfileChangeRequest.Status status) {
        return service.queue(status);
    }

    @PostMapping("/api/moderation/profile-changes/{id}/decision")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    @Operation(summary = "Решение по заявке на смену данных", tags = "Модерация")
    public ProfileDtos.ChangeRequestView decide(@PathVariable Long id, @Valid @RequestBody ModerationDecisionRequest request,
                                                @AuthenticationPrincipal UserPrincipal principal) {
        return service.decide(id, request, principal.getId());
    }
}
