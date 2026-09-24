package com.jobreview.security;

import com.jobreview.model.User;
import com.jobreview.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

/**
 * Вызывается после успешного входа через Google (OpenID Connect).
 * Находим или создаём локального пользователя, выпускаем наш JWT и отправляем
 * браузер обратно на фронтенд. Токен передаём во фрагменте URL (#token=...),
 * потому что фрагмент не уходит на сервер и не попадает в логи прокси.
 */
@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final AuthService authService;
    private final JwtService jwtService;
    private final String frontendUrl;

    public OAuth2LoginSuccessHandler(AuthService authService, JwtService jwtService,
                                     @Value("${app.frontend-url}") String frontendUrl) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OidcUser oidcUser = (OidcUser) authentication.getPrincipal();
        User user = authService.findOrCreateGoogleUser(oidcUser.getEmail(), oidcUser.getFullName());
        String token = jwtService.generateToken(user);

        // Сессия была нужна только на время OAuth-обмена — дальше живём на JWT
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }
        response.sendRedirect(frontendUrl + "/auth/callback#token=" + token);
    }
}
