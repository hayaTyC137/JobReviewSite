package com.jobreview.employee;

import com.jobreview.common.error.ApiError;
import com.jobreview.config.OpenApiConfig;
import com.jobreview.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Сотрудники", description = "Карточка сотрудника, трудовая история, оценки работодателей и дисциплина")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class EmployeeController {

    private final EmployeeProfileService profileService;
    private final EmployerService employerService;

    public EmployeeController(EmployeeProfileService profileService, EmployerService employerService) {
        this.profileService = profileService;
        this.employerService = employerService;
    }

    @GetMapping("/api/me/employee-profile")
    @Operation(summary = "Моя карточка сотрудника", description = "Рейтинг от работодателей, стаж, причины увольнений, дисциплина.")
    public EmployeeProfileDto myProfile(@AuthenticationPrincipal UserPrincipal principal) {
        return profileService.getProfile(principal.getId(), principal);
    }

    @GetMapping("/api/employees/{userId}")
    @Operation(summary = "Карточка сотрудника",
            description = "Доступна подтверждённым представителям компаний, модераторам и самому сотруднику.")
    @ApiResponse(responseCode = "403", description = "Нет права смотреть карточку", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public EmployeeProfileDto profile(@PathVariable Long userId, @AuthenticationPrincipal UserPrincipal principal) {
        return profileService.getProfile(userId, principal);
    }

    // ---------- Панель работодателя ----------

    @GetMapping("/api/company-panel/employees")
    @Operation(summary = "Сотрудники моей компании")
    public List<CompanyEmployeeDto> employees(@AuthenticationPrincipal UserPrincipal principal) {
        return employerService.listEmployees(principal.getId());
    }

    @PostMapping("/api/company-panel/employees")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Добавить запись трудовой истории", description = "Сотрудник ищется по email зарегистрированного аккаунта.")
    public CompanyEmployeeDto addEmployment(@Valid @RequestBody EmployerRequests.AddEmployment request,
                                            @AuthenticationPrincipal UserPrincipal principal) {
        return employerService.addEmployment(principal.getId(), request);
    }

    @PutMapping("/api/company-panel/employees/{recordId}")
    @Operation(summary = "Изменить запись трудовой истории", description = "Например, зафиксировать дату и официальную причину увольнения.")
    public CompanyEmployeeDto updateEmployment(@PathVariable Long recordId,
                                               @Valid @RequestBody EmployerRequests.UpdateEmployment request,
                                               @AuthenticationPrincipal UserPrincipal principal) {
        return employerService.updateEmployment(principal.getId(), recordId, request);
    }

    @PutMapping("/api/company-panel/employees/{recordId}/evaluation")
    @Operation(summary = "Оценить сотрудника", description = "Токсичность, уравновешенность, продуктивность, командная работа, надёжность, коммуникация.")
    public CompanyEmployeeDto evaluate(@PathVariable Long recordId, @Valid @RequestBody EmployerRequests.Evaluate request,
                                       @AuthenticationPrincipal UserPrincipal principal) {
        return employerService.evaluate(principal.getId(), recordId, request);
    }

    @PostMapping("/api/company-panel/employees/{recordId}/discipline")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Зарегистрировать замечание", description = "Попадает в историю сотрудника после подтверждения модератором.")
    public EmployeeProfileDto.Discipline reportDiscipline(@PathVariable Long recordId,
                                                          @Valid @RequestBody EmployerRequests.ReportDiscipline request,
                                                          @AuthenticationPrincipal UserPrincipal principal) {
        return employerService.reportDiscipline(principal.getId(), recordId, request);
    }
}
