package com.jobreview.auth;

import com.jobreview.common.error.BusinessRuleException;
import com.jobreview.security.oauth.OAuthUserInfo;
import com.jobreview.settings.SettingKey;
import com.jobreview.settings.SettingsService;
import com.jobreview.user.Role;
import com.jobreview.user.User;
import com.jobreview.user.UserRepository;
import java.time.LocalDateTime;
import java.util.Locale;
import org.springframework.security.authentication.LockedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Находит или создаёт пользователя по данным внешнего провайдера.
 *
 * Порядок поиска:
 * 1. уже привязанный внешний аккаунт (provider + subject);
 * 2. существующий пользователь с тем же email — только если провайдер подтвердил адрес,
 *    иначе злоумышленник мог бы «присвоить» чужой аккаунт, указав у провайдера чужую почту;
 * 3. новый пользователь с базовой ролью USER и флагом profileCompleted = false.
 */
@Service
public class OAuthAccountService {

    /** Домен .invalid зарезервирован (RFC 2606) — такой адрес точно никому не принадлежит */
    static final String PLACEHOLDER_DOMAIN = "@users.kontur.invalid";

    private final UserRepository userRepository;
    private final UserIdentityRepository identityRepository;
    private final SettingsService settingsService;

    public OAuthAccountService(UserRepository userRepository, UserIdentityRepository identityRepository,
                               SettingsService settingsService) {
        this.userRepository = userRepository;
        this.identityRepository = identityRepository;
        this.settingsService = settingsService;
    }

    @Transactional
    public User provision(OAuthUserInfo info) {
        User user = identityRepository.findByProviderAndSubject(info.provider(), info.subject())
                .map(UserIdentity::getUser)
                .orElseGet(() -> linkOrCreate(info));

        if (user.isBlocked()) {
            throw new LockedException("Аккаунт заблокирован");
        }
        user.setLastLoginAt(LocalDateTime.now());
        return user;
    }

    public static boolean hasPlaceholderEmail(User user) {
        return user.getEmail().endsWith(PLACEHOLDER_DOMAIN);
    }

    private User linkOrCreate(OAuthUserInfo info) {
        String email = normalize(info.email());
        User user = null;
        if (email != null && info.emailVerified()) {
            user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        }
        if (user == null) {
            user = create(info, email);
        }

        UserIdentity identity = new UserIdentity();
        identity.setUser(user);
        identity.setProvider(info.provider());
        identity.setSubject(info.subject());
        identityRepository.save(identity);
        return user;
    }

    private User create(OAuthUserInfo info, String email) {
        if (!settingsService.getBoolean(SettingKey.REGISTRATION_ENABLED)) {
            throw new BusinessRuleException("Регистрация новых пользователей временно закрыта");
        }
        // Неподтверждённый или уже занятый адрес не используем — пользователь укажет почту при дозаполнении профиля
        boolean emailUsable = email != null && info.emailVerified() && !userRepository.existsByEmailIgnoreCase(email);

        User user = new User();
        user.setEmail(emailUsable ? email : placeholderEmail(info));
        user.setDisplayName(shortenName(info.name(), emailUsable ? email : null));
        user.setFullName(info.name() == null || info.name().isBlank() ? null : info.name().trim());
        user.setRole(Role.USER);
        user.setAuthProvider(info.provider());
        user.setProfileCompleted(false);
        return userRepository.save(user);
    }

    private static String placeholderEmail(OAuthUserInfo info) {
        return info.provider().name().toLowerCase(Locale.ROOT) + "-" + info.subject().replaceAll("[^A-Za-z0-9]", "")
                + PLACEHOLDER_DOMAIN;
    }

    private static String normalize(String email) {
        return email == null || email.isBlank() ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    /** «Анна Коваленко» → «Анна К.» — на сайте авторы по умолчанию не светят полную фамилию */
    static String shortenName(String fullName, String email) {
        if (fullName == null || fullName.isBlank()) {
            return email != null ? email.substring(0, email.indexOf('@')) : "Новый пользователь";
        }
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length < 2) {
            return parts[0];
        }
        return parts[0] + " " + parts[1].charAt(0) + ".";
    }
}
