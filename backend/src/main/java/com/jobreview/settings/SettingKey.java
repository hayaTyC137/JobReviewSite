package com.jobreview.settings;

import java.util.Arrays;
import java.util.Optional;
import java.util.function.Predicate;

/**
 * Известные системные настройки. Список закрытый: администратор не может завести произвольный ключ,
 * а каждое значение проходит проверку перед сохранением.
 */
public enum SettingKey {

    REVIEWS_DAILY_LIMIT("reviews.daily_limit", "3", "Сколько отзывов один пользователь может опубликовать за сутки",
            value -> isIntBetween(value, 1, 50), false),
    REGISTRATION_ENABLED("registration.enabled", "true", "Открыта ли регистрация новых пользователей",
            value -> value.equals("true") || value.equals("false"), true),
    SUPPORT_EMAIL("support.email", "support@kontur.work", "Адрес поддержки на странице «Связаться с нами»",
            value -> value.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$") && value.length() <= 160, true),
    ANNOUNCEMENT("platform.announcement", "", "Объявление в шапке сайта (пусто — не показывать)",
            value -> value.length() <= 300, true);

    private final String key;
    private final String defaultValue;
    private final String description;
    private final Predicate<String> validator;
    /** Можно ли отдавать значение без авторизации (GET /api/settings/public) */
    private final boolean exposedPublicly;

    SettingKey(String key, String defaultValue, String description, Predicate<String> validator, boolean exposedPublicly) {
        this.key = key;
        this.defaultValue = defaultValue;
        this.description = description;
        this.validator = validator;
        this.exposedPublicly = exposedPublicly;
    }

    public String key() {
        return key;
    }

    public String defaultValue() {
        return defaultValue;
    }

    public String description() {
        return description;
    }

    public boolean isValid(String value) {
        return value != null && validator.test(value);
    }

    public boolean exposedPublicly() {
        return exposedPublicly;
    }

    public static Optional<SettingKey> fromKey(String key) {
        return Arrays.stream(values()).filter(k -> k.key.equals(key)).findFirst();
    }

    private static boolean isIntBetween(String value, int min, int max) {
        try {
            int number = Integer.parseInt(value);
            return number >= min && number <= max;
        } catch (NumberFormatException ex) {
            return false;
        }
    }
}
