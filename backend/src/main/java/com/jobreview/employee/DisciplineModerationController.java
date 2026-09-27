package com.jobreview.employee;

import com.jobreview.common.web.ModerationDecisionRequest;
import com.jobreview.config.OpenApiConfig;
import com.jobreview.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/moderation/discipline")
@PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
@Tag(name = "Модерация", description = "Очереди модерации")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class DisciplineModerationController {

    private final DisciplineModerationService service;

    public DisciplineModerationController(DisciplineModerationService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Дисциплинарные записи на проверке")
    public List<DisciplineModerationService.DisciplineQueueItem> queue(
            @RequestParam(defaultValue = "PENDING") DisciplinaryRecord.Status status) {
        return service.queue(status);
    }

    @PostMapping("/{id}/decision")
    @Operation(summary = "Подтвердить или отклонить замечание работодателя")
    public DisciplineModerationService.DisciplineQueueItem decide(@PathVariable Long id,
                                                                  @Valid @RequestBody ModerationDecisionRequest request,
                                                                  @AuthenticationPrincipal UserPrincipal principal) {
        return service.decide(id, request, principal.getId());
    }
}
