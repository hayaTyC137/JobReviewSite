package com.jobreview.admin;

import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jobreview.IntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/**
 * RBAC: доступ к разделам по ролям, смена ролей и блокировки администратором.
 * Ключевое свойство — права берутся из базы при каждом запросе, поэтому изменения действуют
 * сразу, без повторного входа, а заблокированный пользователь теряет доступ со старым токеном.
 */
class RoleManagementIntegrationTest extends IntegrationTestSupport {

    @Test
    void sectionsAreSeparatedByRole() throws Exception {
        String user = register("rbac").token();
        String moderator = login("moderator@demo.ru");
        String admin = login("admin@demo.ru");

        perform(get("/api/moderation/summary"), user, null).andExpect(status().isForbidden());
        perform(get("/api/admin/dashboard"), user, null).andExpect(status().isForbidden());

        perform(get("/api/moderation/summary"), moderator, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingCompanies", greaterThan(0)));
        perform(get("/api/admin/users"), moderator, null).andExpect(status().isForbidden());

        // Администратору доступно всё, что модератору, плюс админка
        perform(get("/api/moderation/summary"), admin, null).andExpect(status().isOk());
        perform(get("/api/admin/dashboard"), admin, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.users", greaterThan(0)))
                .andExpect(jsonPath("$.monthly.length()").value(12))
                .andExpect(jsonPath("$.load.requestsPerMinute.length()").value(60));
    }

    @Test
    void roleChangeTakesEffectImmediatelyWithTheSameToken() throws Exception {
        Account account = register("promote");
        String admin = login("admin@demo.ru");

        perform(get("/api/moderation/summary"), account.token(), null).andExpect(status().isForbidden());

        perform(put("/api/admin/users/" + account.id() + "/role"), admin, json("role", "MODERATOR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("MODERATOR"));

        // Тот же токен, без повторного входа
        perform(get("/api/moderation/summary"), account.token(), null).andExpect(status().isOk());
        perform(get("/api/auth/me"), account.token(), null).andExpect(jsonPath("$.role").value("MODERATOR"));

        perform(put("/api/admin/users/" + account.id() + "/role"), admin, json("role", "USER")).andExpect(status().isOk());
        perform(get("/api/moderation/summary"), account.token(), null).andExpect(status().isForbidden());
    }

    @Test
    void representativeRoleRequiresCompanyAndAdminCannotChangeOwnRole() throws Exception {
        Account account = register("rep-role");
        String admin = login("admin@demo.ru");
        long adminId = body(perform(get("/api/auth/me"), admin, null)).path("id").asLong();

        perform(put("/api/admin/users/" + account.id() + "/role"), admin, json("role", "REPRESENTATIVE"))
                .andExpect(status().isBadRequest());

        perform(put("/api/admin/users/" + adminId + "/role"), admin, json("role", "USER"))
                .andExpect(status().isConflict());
        perform(put("/api/admin/users/" + adminId + "/block"), admin, json("blocked", true, "reason", "тест"))
                .andExpect(status().isConflict());

        // Модератор не может менять роли
        perform(put("/api/admin/users/" + account.id() + "/role"), login("moderator@demo.ru"), json("role", "ADMIN"))
                .andExpect(status().isForbidden());
    }

    @Test
    void blockingRevokesExistingTokenAndPreventsLogin() throws Exception {
        Account account = register("block");
        String admin = login("admin@demo.ru");

        perform(put("/api/admin/users/" + account.id() + "/block"), admin, json("blocked", true))
                .andExpect(status().isBadRequest());
        perform(put("/api/admin/users/" + account.id() + "/block"), admin, json("blocked", true, "reason", "Накрутка отзывов"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").value(true));

        perform(get("/api/auth/me"), account.token(), null).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", account.email(), "password", "strongPass1")))
                .andExpect(status().isForbidden());

        perform(put("/api/admin/users/" + account.id() + "/block"), admin, json("blocked", false)).andExpect(status().isOk());
        perform(get("/api/auth/me"), account.token(), null).andExpect(status().isOk());
    }

    @Test
    void settingsAreValidatedAndApplied() throws Exception {
        String admin = login("admin@demo.ru");
        perform(put("/api/admin/settings/reviews.daily_limit"), admin, json("value", "500")).andExpect(status().isBadRequest());
        perform(put("/api/admin/settings/unknown.key"), admin, json("value", "1")).andExpect(status().isNotFound());
        perform(put("/api/admin/settings/platform.announcement"), admin, json("value", "Плановые работы в субботу"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/settings/public"))
                .andExpect(jsonPath("$['platform.announcement']").value("Плановые работы в субботу"));
        perform(put("/api/admin/settings/platform.announcement"), admin, json("value", "")).andExpect(status().isOk());
    }
}
