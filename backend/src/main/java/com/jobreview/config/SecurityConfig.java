package com.jobreview.config;

import com.jobreview.security.JwtAuthenticationFilter;
import com.jobreview.security.oauth.ConfiguredClientRegistrations;
import com.jobreview.security.oauth.OAuth2LoginHandlers;
import com.jobreview.security.oauth.SocialOAuth2UserService;
import com.jobreview.security.oauth.UnknownProviderFilter;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestRedirectFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Настройка безопасности и ролевая модель на уровне URL.
 *
 * Публично (без входа): поиск и карточки компаний, аналитика, лента отзывов, карточки авторов,
 * справочник локаций, статистика платформы, публичные настройки, загруженные картинки,
 * отправка обращения в поддержку, Swagger.
 * /api/moderation/** — MODERATOR и ADMIN, /api/admin/** — только ADMIN,
 * обжалование отзыва — только REPRESENTATIVE (что это представитель именно той компании,
 * дополнительно проверяет сервис). Контроллеры продублированы @PreAuthorize: если кто-то
 * поменяет правила здесь, защита не пропадёт.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final OAuth2LoginHandlers oauth2Handlers;
    private final SocialOAuth2UserService socialUserService;
    private final ConfiguredClientRegistrations clientRegistrations;
    private final String allowedOrigins;
    private final String frontendUrl;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter,
                          OAuth2LoginHandlers oauth2Handlers,
                          SocialOAuth2UserService socialUserService,
                          ConfiguredClientRegistrations clientRegistrations,
                          @Value("${app.cors.allowed-origins}") String allowedOrigins,
                          @Value("${app.frontend-url}") String frontendUrl) {
        this.jwtFilter = jwtFilter;
        this.oauth2Handlers = oauth2Handlers;
        this.socialUserService = socialUserService;
        this.clientRegistrations = clientRegistrations;
        this.allowedOrigins = allowedOrigins;
        this.frontendUrl = frontendUrl;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // REST API на JWT в заголовке: браузер не шлёт токен сам, поэтому CSRF-защита не нужна
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // Сессия создаётся только на время OAuth2-входа (там хранится state),
                // для обычных API-запросов пользователь определяется по JWT
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .headers(headers -> headers
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .permissionsPolicy(permissions -> permissions.policy("camera=(), microphone=(), geolocation=()")))
                // Без токена на закрытом маршруте отвечаем 401, а не редиректом на страницу входа
                .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                        .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/providers").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/companies/**", "/api/locations", "/api/stats",
                                "/api/settings/public", "/api/files/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/users/*/card").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/support/tickets").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/moderation/**").hasAnyRole("MODERATOR", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/reviews/*/appeals").hasRole("REPRESENTATIVE")
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                // Ссылка на соцсеть без настроенных ключей — редирект с ошибкой вместо HTTP 500
                .addFilterBefore(new UnknownProviderFilter(clientRegistrations, frontendUrl), OAuth2AuthorizationRequestRedirectFilter.class);

        // Вход через соцсети включаем, только если настроен хотя бы один провайдер.
        // Так приложение спокойно запускается локально и без ключей.
        if (!clientRegistrations.isEmpty()) {
            http.oauth2Login(oauth -> oauth
                    .userInfoEndpoint(userInfo -> userInfo.userService(socialUserService))
                    .successHandler(oauth2Handlers)
                    .failureHandler(oauth2Handlers));
        }

        return http.build();
    }

    /** Разрешаем фронтенду с другого порта/домена обращаться к API */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(",")).map(String::trim).toList();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
