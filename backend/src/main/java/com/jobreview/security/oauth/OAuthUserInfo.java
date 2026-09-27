package com.jobreview.security.oauth;

import com.jobreview.user.AuthProvider;
import java.util.Map;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;

/**
 * Данные внешнего аккаунта в едином виде: у каждого провайдера свои названия полей.
 *
 * @param subject       постоянный id пользователя у провайдера
 * @param email         может быть null (например, GitHub без публичного адреса)
 * @param emailVerified провайдер подтвердил владение адресом — только тогда разрешаем
 *                      привязку к существующему аккаунту с тем же email
 */
public record OAuthUserInfo(AuthProvider provider, String subject, String email, boolean emailVerified, String name) {

    public static OAuthUserInfo from(OAuthProvider provider, OAuth2User user) {
        Map<String, Object> a = user.getAttributes();
        return switch (provider) {
            case GOOGLE, LINKEDIN -> {
                OidcUser oidc = (OidcUser) user;
                yield new OAuthUserInfo(provider.authProvider(), oidc.getSubject(), oidc.getEmail(),
                        Boolean.TRUE.equals(oidc.getEmailVerified()), oidc.getFullName());
            }
            // Публичный email на GitHub можно выбрать только из подтверждённых; скрытый достаём в SocialOAuth2UserService
            case GITHUB -> new OAuthUserInfo(provider.authProvider(), str(a.get("id")), str(a.get("email")),
                    a.get("email") != null && !Boolean.FALSE.equals(a.get("email_verified")),
                    firstNonBlank(str(a.get("name")), str(a.get("login"))));
            // Facebook отдаёт только подтверждённый адрес
            case FACEBOOK -> new OAuthUserInfo(provider.authProvider(), str(a.get("id")), str(a.get("email")),
                    a.get("email") != null, str(a.get("name")));
            case YANDEX -> new OAuthUserInfo(provider.authProvider(), str(a.get("id")), str(a.get("default_email")),
                    a.get("default_email") != null,
                    firstNonBlank(str(a.get("real_name")), str(a.get("display_name")), str(a.get("login"))));
        };
    }

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return null;
    }
}
