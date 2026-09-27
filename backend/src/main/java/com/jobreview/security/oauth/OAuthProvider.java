package com.jobreview.security.oauth;

import com.jobreview.user.AuthProvider;
import java.util.Arrays;
import java.util.Optional;

/** Поддерживаемые внешние провайдеры входа */
public enum OAuthProvider {
    GOOGLE("google", AuthProvider.GOOGLE),
    GITHUB("github", AuthProvider.GITHUB),
    FACEBOOK("facebook", AuthProvider.FACEBOOK),
    YANDEX("yandex", AuthProvider.YANDEX),
    LINKEDIN("linkedin", AuthProvider.LINKEDIN);

    private final String registrationId;
    private final AuthProvider authProvider;

    OAuthProvider(String registrationId, AuthProvider authProvider) {
        this.registrationId = registrationId;
        this.authProvider = authProvider;
    }

    public String registrationId() {
        return registrationId;
    }

    public AuthProvider authProvider() {
        return authProvider;
    }

    public static Optional<OAuthProvider> fromRegistrationId(String registrationId) {
        return Arrays.stream(values()).filter(p -> p.registrationId.equals(registrationId)).findFirst();
    }
}
