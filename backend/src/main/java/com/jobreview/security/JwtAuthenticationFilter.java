package com.jobreview.security;

import com.jobreview.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Достаёт токен из заголовка "Authorization: Bearer ..." и, если он валиден,
 * кладёт пользователя в SecurityContext. Невалидный токен не приводит к ошибке —
 * запрос идёт дальше как анонимный, а закрытые маршруты сами вернут 401.
 *
 * Роль и блокировка берутся из базы, а не из токена: смена роли администратором
 * и блокировка действуют сразу, без повторного входа и без ожидания истечения JWT.
 * Это один запрос по первичному ключу — цена за мгновенный отзыв прав.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());
            jwtService.parseUserId(token)
                    .flatMap(userRepository::findById)
                    .filter(user -> !user.isBlocked())
                    .map(UserPrincipal::from)
                    .ifPresent(principal -> {
                        var authentication = new UsernamePasswordAuthenticationToken(
                                principal, null, principal.getAuthorities());
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    });
        }

        chain.doFilter(request, response);
    }
}
