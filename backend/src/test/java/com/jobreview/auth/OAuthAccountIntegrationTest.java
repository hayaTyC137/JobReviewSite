package com.jobreview.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jobreview.IntegrationTestSupport;
import com.jobreview.security.JwtService;
import com.jobreview.security.oauth.OAuthUserInfo;
import com.jobreview.user.AuthProvider;
import com.jobreview.user.Role;
import com.jobreview.user.User;
import com.jobreview.user.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.LockedException;

/**
 * Вход через соцсети: автосоздание аккаунта с ролью USER, повторный вход, безопасная привязка по email
 * и дозаполнение профиля. Сам редирект к провайдеру не тестируем — это код Spring Security,
 * проверяем нашу логику после успешного ответа провайдера.
 */
class OAuthAccountIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private OAuthAccountService accountService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Test
    void firstLoginCreatesUserWithBaseRoleAndRequiresOnboarding() throws Exception {
        String subject = UUID.randomUUID().toString();
        String email = "new-" + subject.substring(0, 8) + "@gmail.test";
        User user = accountService.provision(new OAuthUserInfo(AuthProvider.GOOGLE, subject, email, true, "Мария Петренко"));

        assertThat(user.getRole()).isEqualTo(Role.USER);
        assertThat(user.getAuthProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(user.isProfileCompleted()).isFalse();
        assertThat(user.getDisplayName()).isEqualTo("Мария П.");
        assertThat(user.getPasswordHash()).isNull();

        // Повторный вход тем же аккаунтом — тот же пользователь, а не новый
        User again = accountService.provision(new OAuthUserInfo(AuthProvider.GOOGLE, subject, email, true, "Мария Петренко"));
        assertThat(again.getId()).isEqualTo(user.getId());

        // Минимальные данные профиля: без согласия с правилами — ошибка валидации
        String token = jwtService.generateToken(user);
        perform(post("/api/auth/onboarding"), token,
                json("displayName", "Мария П.", "country", "Молдова", "city", "Кишинёв", "acceptTerms", false))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.acceptTerms").exists());

        perform(post("/api/auth/onboarding"), token,
                json("displayName", "Мария П.", "jobTitle", "Аналитик", "country", "Молдова", "city", "Кишинёв", "acceptTerms", true))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profileCompleted").value(true))
                .andExpect(jsonPath("$.city").value("Кишинёв"));

        // Повторно дозаполнить нельзя — дальше через личный кабинет
        perform(post("/api/auth/onboarding"), token,
                json("displayName", "Мария", "country", "Молдова", "city", "Бельцы", "acceptTerms", true))
                .andExpect(status().isConflict());
    }

    @Test
    void verifiedEmailLinksExistingAccountButUnverifiedDoesNot() throws Exception {
        Account local = register("linked");

        User linked = accountService.provision(new OAuthUserInfo(AuthProvider.GITHUB, "gh-" + local.id(), local.email(), true, "Linked"));
        assertThat(linked.getId()).isEqualTo(local.id());

        // Провайдер не подтвердил адрес — не «присваиваем» чужой аккаунт, создаём отдельный с временным email
        User separate = accountService.provision(new OAuthUserInfo(AuthProvider.FACEBOOK, "fb-" + local.id(), local.email(), false, "Someone"));
        assertThat(separate.getId()).isNotEqualTo(local.id());
        assertThat(separate.getEmail()).endsWith(OAuthAccountService.PLACEHOLDER_DOMAIN);

        // Такому пользователю при дозаполнении профиля нужно указать настоящий email
        String token = jwtService.generateToken(separate);
        perform(post("/api/auth/onboarding"), token,
                json("displayName", "Someone", "country", "Россия", "city", "Казань", "acceptTerms", true))
                .andExpect(status().isBadRequest());
        String realEmail = "real-" + separate.getId() + "@test.local";
        perform(post("/api/auth/onboarding"), token,
                json("displayName", "Someone", "country", "Россия", "city", "Казань", "email", realEmail, "acceptTerms", true))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(realEmail));
        perform(get("/api/auth/me"), token, null).andExpect(jsonPath("$.email").value(realEmail));
    }

    @Test
    void blockedUserCannotSignInThroughSocialNetwork() {
        String subject = UUID.randomUUID().toString();
        User user = accountService.provision(new OAuthUserInfo(AuthProvider.YANDEX, subject, null, false, "Блок"));
        user.setBlocked(true);
        userRepository.save(user);

        assertThatThrownBy(() -> accountService.provision(new OAuthUserInfo(AuthProvider.YANDEX, subject, null, false, "Блок")))
                .isInstanceOf(LockedException.class);
    }
}
