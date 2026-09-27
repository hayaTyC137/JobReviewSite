package com.jobreview.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jobreview.IntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/**
 * Регистрация, вход, проверка токена и список способов входа.
 */
class AuthIntegrationTest extends IntegrationTestSupport {

    @Test
    void registerThenLoginAndReadProfile() throws Exception {
        Account account = register("auth");

        perform(get("/api/auth/me"), account.token(), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(account.email()))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.profileCompleted").value(true));

        String token = login(account.email(), "strongPass1");
        perform(get("/api/auth/me"), token, null).andExpect(status().isOk());
    }

    @Test
    void duplicateEmailAndBadInputAreRejected() throws Exception {
        Account account = register("dup");
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", account.email().toUpperCase(), "password", "strongPass1", "displayName", "Двойник")))
                .andExpect(status().isConflict());

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", "not-an-email", "password", "short", "displayName", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    void wrongPasswordAndMissingTokenGive401() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", "anna.k@demo.ru", "password", "wrong-password")))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer forged.token.value"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void providersListsAllSocialNetworksAsDisabledWithoutKeys() throws Exception {
        mvc.perform(get("/api/auth/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.password").value(true))
                .andExpect(jsonPath("$.google").value(false))
                .andExpect(jsonPath("$.github").value(false))
                .andExpect(jsonPath("$.facebook").value(false))
                .andExpect(jsonPath("$.yandex").value(false))
                .andExpect(jsonPath("$.linkedin").value(false));

        // Переход на провайдера без ключей — редирект на фронтенд с ошибкой, а не 500
        mvc.perform(get("/oauth2/authorization/linkedin"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/auth/callback#error=oauth"));
    }
}
