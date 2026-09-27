package com.jobreview.security.oauth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Переход на /oauth2/authorization/{id} для провайдера без ключей Spring Security превращает в HTTP 500
 * («Invalid Client Registration»). Перехватываем такие запросы раньше и возвращаем пользователя
 * на фронтенд с понятной ошибкой, как при любом неудачном входе через соцсеть.
 * Не @Component — фильтр подключается только в цепочку безопасности (SecurityConfig).
 */
public class UnknownProviderFilter extends OncePerRequestFilter {

    private static final String PREFIX = "/oauth2/authorization/";

    private final ConfiguredClientRegistrations registrations;
    private final String frontendUrl;

    public UnknownProviderFilter(ConfiguredClientRegistrations registrations, String frontendUrl) {
        this.registrations = registrations;
        this.frontendUrl = frontendUrl;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(PREFIX);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String id = request.getRequestURI().substring(PREFIX.length());
        if (registrations.findByRegistrationId(id) == null) {
            response.sendRedirect(frontendUrl + "/auth/callback#error=oauth");
            return;
        }
        chain.doFilter(request, response);
    }
}
