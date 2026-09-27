package com.jobreview.security.oauth;

import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;

/**
 * Регистрации OAuth 2.0-клиентов. Каждый провайдер включается сам, как только в окружении
 * заданы его ключи (например GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET) — профили Spring не нужны.
 * Без ключей приложение спокойно работает только со входом по паролю.
 *
 * Redirect URI для консоли провайдера: {адрес сайта}/login/oauth2/code/{google|github|facebook|yandex|linkedin}
 */
@Configuration
public class OAuthClientConfig {

    private static final Logger log = LoggerFactory.getLogger(OAuthClientConfig.class);
    private static final String REDIRECT_URI = "{baseUrl}/{action}/oauth2/code/{registrationId}";

    @Bean
    public ConfiguredClientRegistrations clientRegistrationRepository(Environment env) {
        List<ClientRegistration> registrations = new ArrayList<>();
        for (OAuthProvider provider : OAuthProvider.values()) {
            String id = env.getProperty("app.oauth." + provider.registrationId() + ".client-id", "");
            String secret = env.getProperty("app.oauth." + provider.registrationId() + ".client-secret", "");
            if (!id.isBlank() && !secret.isBlank()) {
                registrations.add(build(provider, id.trim(), secret.trim()));
            }
        }
        log.info("Вход через соцсети: {}", registrations.isEmpty() ? "выключен (ключи не заданы)"
                : registrations.stream().map(ClientRegistration::getRegistrationId).toList());
        return new ConfiguredClientRegistrations(registrations);
    }

    static ClientRegistration build(OAuthProvider provider, String clientId, String clientSecret) {
        ClientRegistration.Builder builder = switch (provider) {
            case GOOGLE -> CommonOAuth2Provider.GOOGLE.getBuilder("google");
            case GITHUB -> CommonOAuth2Provider.GITHUB.getBuilder("github")
                    // user:email — чтобы получить адрес, даже если он скрыт в публичном профиле
                    .scope("read:user", "user:email");
            case FACEBOOK -> CommonOAuth2Provider.FACEBOOK.getBuilder("facebook");
            case YANDEX -> ClientRegistration.withRegistrationId("yandex")
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri(REDIRECT_URI)
                    .scope("login:email", "login:info")
                    .authorizationUri("https://oauth.yandex.ru/authorize")
                    .tokenUri("https://oauth.yandex.ru/token")
                    .userInfoUri("https://login.yandex.ru/info?format=json")
                    .userNameAttributeName("id")
                    .clientName("Яндекс ID");
            // LinkedIn — OpenID Connect: id_token проверяется по JWKS и issuer
            case LINKEDIN -> ClientRegistration.withRegistrationId("linkedin")
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri(REDIRECT_URI)
                    .scope("openid", "profile", "email")
                    .authorizationUri("https://www.linkedin.com/oauth/v2/authorization")
                    .tokenUri("https://www.linkedin.com/oauth/v2/accessToken")
                    .jwkSetUri("https://www.linkedin.com/oauth/openid/jwks")
                    .issuerUri("https://www.linkedin.com/oauth")
                    .userInfoUri("https://api.linkedin.com/v2/userinfo")
                    .userNameAttributeName("sub")
                    .clientName("LinkedIn");
        };
        return builder.clientId(clientId).clientSecret(clientSecret).build();
    }
}
