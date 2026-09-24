package com.jobreview.controller;

import com.jobreview.config.OpenApiConfig;
import com.jobreview.dto.AuthResponse;
import com.jobreview.dto.LoginRequest;
import com.jobreview.dto.RegisterRequest;
import com.jobreview.dto.UserDto;
import com.jobreview.exception.ApiError;
import com.jobreview.security.UserPrincipal;
import com.jobreview.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Авторизация", description = "Регистрация, вход по паролю, вход через Google (OAuth 2.0 / OIDC)")
public class AuthController {

    private final AuthService authService;
    private final ObjectProvider<ClientRegistrationRepository> clientRegistrations;

    public AuthController(AuthService authService, ObjectProvider<ClientRegistrationRepository> clientRegistrations) {
        this.authService = authService;
        this.clientRegistrations = clientRegistrations;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Регистрация", description = "Создаёт пользователя с ролью USER и сразу возвращает JWT.")
    @ApiResponse(responseCode = "201", description = "Пользователь создан")
    @ApiResponse(responseCode = "400", description = "Ошибка валидации", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "Email уже занят", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    @Operation(summary = "Вход по email и паролю", description = "Демо-аккаунты: anna.k@demo.ru (автор), ceo@nova.demo (представитель NOVA), moderator@demo.ru — пароль demo12345.")
    @ApiResponse(responseCode = "200", description = "Успешный вход")
    @ApiResponse(responseCode = "401", description = "Неверный email или пароль", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    @SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
    @Operation(summary = "Текущий пользователь", description = "Проверка токена и получение актуальной роли/компании.")
    @ApiResponse(responseCode = "200", description = "Данные пользователя")
    @ApiResponse(responseCode = "401", description = "Нет или истёк JWT")
    public UserDto me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.me(principal.getId());
    }

    @GetMapping("/providers")
    @Operation(summary = "Доступные способы входа",
            description = "Фронтенд показывает кнопку «Войти через Google», только если OAuth настроен на сервере. "
                    + "Сам вход начинается переходом на /oauth2/authorization/google.")
    public Map<String, Boolean> providers() {
        return Map.of("password", true, "google", clientRegistrations.getIfAvailable() != null);
    }
}
