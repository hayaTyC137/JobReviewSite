package com.jobreview.auth;

import com.jobreview.common.error.ApiError;
import com.jobreview.common.ratelimit.RateLimiter;
import com.jobreview.common.web.ClientIp;
import com.jobreview.config.OpenApiConfig;
import com.jobreview.security.UserPrincipal;
import com.jobreview.security.oauth.ConfiguredClientRegistrations;
import com.jobreview.security.oauth.OAuthProvider;
import com.jobreview.user.UserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Авторизация", description = "Регистрация, вход по паролю, вход через соцсети (OAuth 2.0 / OpenID Connect)")
public class AuthController {

    private final AuthService authService;
    private final ConfiguredClientRegistrations clientRegistrations;
    private final RateLimiter rateLimiter;

    public AuthController(AuthService authService, ConfiguredClientRegistrations clientRegistrations,
                          RateLimiter rateLimiter) {
        this.authService = authService;
        this.clientRegistrations = clientRegistrations;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Регистрация", description = "Создаёт пользователя с ролью USER и сразу возвращает JWT.")
    @ApiResponse(responseCode = "201", description = "Пользователь создан")
    @ApiResponse(responseCode = "400", description = "Ошибка валидации", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "Email уже занят или регистрация закрыта", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "429", description = "Слишком много регистраций с одного адреса", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public AuthResponse register(@Valid @RequestBody RegisterRequest request, HttpServletRequest http) {
        rateLimiter.check("register:" + ClientIp.of(http), 5, Duration.ofHours(1),
                "Слишком много регистраций подряд. Попробуйте позже.");
        return authService.register(request);
    }

    @PostMapping("/login")
    @Operation(summary = "Вход по email и паролю",
            description = "Демо-аккаунты (пароль demo12345): anna.k@demo.ru — сотрудник, ceo@nova.demo — представитель NOVA, "
                    + "moderator@demo.ru — модератор, admin@demo.ru — администратор.")
    @ApiResponse(responseCode = "200", description = "Успешный вход")
    @ApiResponse(responseCode = "401", description = "Неверный email или пароль", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "403", description = "Аккаунт заблокирован", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "429", description = "Слишком много попыток входа", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        // Ограничиваем и по адресу клиента, и по аккаунту: перебор пароля одного пользователя с разных IP тоже тормозится
        String ip = ClientIp.of(http);
        String message = "Слишком много попыток входа. Подождите несколько минут.";
        rateLimiter.check("login-ip:" + ip, 30, Duration.ofMinutes(5), message);
        rateLimiter.check("login-account:" + request.email().toLowerCase(Locale.ROOT), 10, Duration.ofMinutes(5), message);
        return authService.login(request);
    }

    @GetMapping("/me")
    @SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
    @Operation(summary = "Текущий пользователь", description = "Проверка токена и получение актуальной роли/компании.")
    @ApiResponse(responseCode = "200", description = "Данные пользователя")
    @ApiResponse(responseCode = "401", description = "Нет или истёк JWT, либо аккаунт заблокирован")
    public UserDto me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.me(principal.getId());
    }

    @PostMapping("/onboarding")
    @SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
    @Operation(summary = "Дозаполнение профиля после входа через соцсеть",
            description = "Публичное имя, страна и город, согласие с правилами; email — если провайдер его не передал.")
    @ApiResponse(responseCode = "200", description = "Профиль заполнен")
    @ApiResponse(responseCode = "409", description = "Профиль уже заполнен или email занят", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public UserDto onboarding(@Valid @RequestBody OnboardingRequest request, @AuthenticationPrincipal UserPrincipal principal) {
        return authService.completeOnboarding(principal.getId(), request);
    }

    @GetMapping("/providers")
    @Operation(summary = "Доступные способы входа",
            description = "Фронтенд показывает кнопки только тех соцсетей, для которых на сервере заданы ключи. "
                    + "Сам вход начинается переходом на /oauth2/authorization/{google|github|facebook|yandex|linkedin}.")
    public Map<String, Boolean> providers() {
        Map<String, Boolean> result = new LinkedHashMap<>();
        result.put("password", true);
        for (OAuthProvider provider : OAuthProvider.values()) {
            result.put(provider.registrationId(), clientRegistrations.enabledIds().contains(provider.registrationId()));
        }
        return result;
    }
}
