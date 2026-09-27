package com.jobreview.companypanel;

import com.jobreview.common.error.ApiError;
import com.jobreview.company.CompanyForm;
import com.jobreview.config.OpenApiConfig;
import com.jobreview.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/company-panel")
@Tag(name = "Панель компании", description = "Кабинет представителя: заявка в реестр, профиль компании, представители")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class CompanyPanelController {

    private final CompanyPanelService service;

    public CompanyPanelController(CompanyPanelService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Моя компания", description = "Профиль со статусом в реестре, представители и сводка.")
    @ApiResponse(responseCode = "404", description = "Пользователь ещё не связан с компанией", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public CompanyPanelDtos.Panel panel(@AuthenticationPrincipal UserPrincipal principal) {
        return service.panel(principal.getId());
    }

    @PostMapping("/company")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Зарегистрировать компанию",
            description = "Создаёт заявку в реестр (PENDING). Компания появится в поиске после проверки модератором, "
                    + "а заявитель станет её подтверждённым представителем.")
    @ApiResponse(responseCode = "409", description = "Пользователь уже представляет компанию или ИНН занят", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public CompanyPanelDtos.Panel register(@Valid @RequestBody CompanyForm form, @AuthenticationPrincipal UserPrincipal principal) {
        return service.register(principal.getId(), form);
    }

    @PutMapping("/company")
    @Operation(summary = "Изменить профиль компании",
            description = "Логотип, баннер, описание и контакты. Отклонённая заявка после правки уходит на повторную проверку.")
    public CompanyPanelDtos.Panel update(@Valid @RequestBody CompanyForm form, @AuthenticationPrincipal UserPrincipal principal) {
        return service.update(principal.getId(), form);
    }

    @PostMapping("/representatives")
    @Operation(summary = "Пригласить представителя", description = "Коллега станет представителем после подтверждения модератором.")
    public CompanyPanelDtos.Panel invite(@Valid @RequestBody CompanyPanelDtos.InviteRepresentative request,
                                         @AuthenticationPrincipal UserPrincipal principal) {
        return service.inviteRepresentative(principal.getId(), request);
    }

    @DeleteMapping("/representatives/{userId}")
    @Operation(summary = "Отозвать статус представителя у коллеги")
    public CompanyPanelDtos.Panel remove(@PathVariable Long userId, @AuthenticationPrincipal UserPrincipal principal) {
        return service.removeRepresentative(principal.getId(), userId);
    }
}
