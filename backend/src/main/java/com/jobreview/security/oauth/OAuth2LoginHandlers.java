package com.jobreview.security.oauth;

import com.jobreview.auth.OAuthAccountService;
import com.jobreview.common.error.BusinessRuleException;
import com.jobreview.security.JwtService;
import com.jobreview.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

/**
 * Завершение входа через соцсеть.
 *
 * Успех: находим или создаём локального пользователя (роль USER), выпускаем наш JWT и отправляем
 * браузер на фронтенд. Токен передаём во фрагменте URL (#token=...), потому что фрагмент не уходит
 * на сервер и не попадает в логи прокси. Новому пользователю добавляем onboarding=1 — фронтенд
 * попросит дозаполнить минимальные данные профиля.
 *
 * Ошибка: возвращаем на фронтенд с кодом причины (#error=...), без технических подробностей.
 */
@Component
public class OAuth2LoginHandlers implements AuthenticationSuccessHandler, AuthenticationFailureHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2LoginHandlers.class);

    private final OAuthAccountService accountService;
    private final JwtService jwtService;
    private final String frontendUrl;

    public OAuth2LoginHandlers(OAuthAccountService accountService, JwtService jwtService,
                               @Value("${app.frontend-url}") String frontendUrl) {
        this.accountService = accountService;
        this.jwtService = jwtService;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        // Сессия была нужна только на время OAuth-обмена (state) — дальше живём на JWT
        invalidateSession(request);

        OAuth2AuthenticationToken oauth = (OAuth2AuthenticationToken) authentication;
        OAuthProvider provider = OAuthProvider.fromRegistrationId(oauth.getAuthorizedClientRegistrationId()).orElse(null);
        if (provider == null) {
            redirectWithError(response, "oauth");
            return;
        }

        try {
            User user = accountService.provision(OAuthUserInfo.from(provider, oauth.getPrincipal()));
            String fragment = "token=" + jwtService.generateToken(user) + (user.isProfileCompleted() ? "" : "&onboarding=1");
            response.sendRedirect(frontendUrl + "/auth/callback#" + fragment);
        } catch (LockedException ex) {
            redirectWithError(response, "blocked");
        } catch (BusinessRuleException ex) {
            redirectWithError(response, "registration_closed");
        }
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {
        log.warn("Вход через соцсеть не удался: {}", exception.getMessage());
        invalidateSession(request);
        redirectWithError(response, "oauth");
    }

    private void redirectWithError(HttpServletResponse response, String code) throws IOException {
        response.sendRedirect(frontendUrl + "/auth/callback#error=" + code);
    }

    private static void invalidateSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }
}
