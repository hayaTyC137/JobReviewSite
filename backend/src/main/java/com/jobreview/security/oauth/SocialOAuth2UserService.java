package com.jobreview.security.oauth;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Загрузка профиля для «обычных» OAuth 2.0-провайдеров (не OpenID Connect).
 * GitHub не отдаёт email в /user, если адрес скрыт: тогда запрашиваем /user/emails
 * и берём основной подтверждённый адрес.
 */
@Component
public class SocialOAuth2UserService extends DefaultOAuth2UserService {

    private static final String GITHUB_EMAILS = "https://api.github.com/user/emails";

    private final RestClient restClient = RestClient.create();

    @Override
    public OAuth2User loadUser(OAuth2UserRequest request) throws OAuth2AuthenticationException {
        OAuth2User user = super.loadUser(request);
        if (!"github".equals(request.getClientRegistration().getRegistrationId()) || user.getAttribute("email") != null) {
            return user;
        }

        Map<String, Object> attributes = new HashMap<>(user.getAttributes());
        try {
            List<Map<String, Object>> emails = restClient.get()
                    .uri(GITHUB_EMAILS)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + request.getAccessToken().getTokenValue())
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {
                    });
            if (emails != null) {
                emails.stream()
                        .filter(e -> Boolean.TRUE.equals(e.get("primary")) && Boolean.TRUE.equals(e.get("verified")))
                        .findFirst()
                        .ifPresent(e -> {
                            attributes.put("email", e.get("email"));
                            attributes.put("email_verified", true);
                        });
            }
        } catch (RestClientException ex) {
            // Без email вход всё равно возможен: адрес пользователь укажет при дозаполнении профиля
        }
        String nameKey = request.getClientRegistration().getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();
        return new DefaultOAuth2User(user.getAuthorities(), attributes, nameKey);
    }
}
