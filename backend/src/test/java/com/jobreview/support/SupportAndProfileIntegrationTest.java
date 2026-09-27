package com.jobreview.support;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jobreview.IntegrationTestSupport;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/**
 * «Связаться с нами» и личный кабинет: обращения со статусами, смена данных профиля через модератора.
 */
class SupportAndProfileIntegrationTest extends IntegrationTestSupport {

    private Map<String, Object> ticket(String email) {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "Гость");
        body.put("email", email);
        body.put("topic", "GENERAL");
        body.put("subject", "Вопрос о платформе");
        body.put("message", "Подскажите, как работает проверка компаний перед публикацией?");
        return body;
    }

    @Test
    void guestAndUserCanWriteToSupportAndUserSeesStatus() throws Exception {
        mvc.perform(post("/api/support/tickets").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ticket("guest@test.local"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("NEW"))
                .andExpect(jsonPath("$.fromRegisteredUser").value(false));

        // Поле-ловушка для ботов
        Map<String, Object> bot = ticket("bot@test.local");
        bot.put("website", "http://spam.example");
        mvc.perform(post("/api/support/tickets").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(bot)))
                .andExpect(status().isBadRequest());

        Account user = register("support");
        long ticketId = body(perform(post("/api/support/tickets"), user.token(), ticket("spoofed@test.local"))
                .andExpect(status().isCreated())
                // Ответ придёт на адрес аккаунта, а не на введённый в форме
                .andExpect(jsonPath("$.email").value(user.email()))).path("id").asLong();

        String moderator = login("moderator@demo.ru");
        perform(put("/api/moderation/tickets/" + ticketId), moderator, Map.of("status", "RESOLVED"))
                .andExpect(status().isBadRequest());
        perform(put("/api/moderation/tickets/" + ticketId), moderator,
                Map.of("status", "RESOLVED", "response", "Каждую заявку проверяет модератор по открытым реестрам."))
                .andExpect(status().isOk());

        perform(get("/api/support/tickets/mine"), user.token(), null)
                .andExpect(jsonPath("$[0].status").value("RESOLVED"))
                .andExpect(jsonPath("$[0].response").value("Каждую заявку проверяет модератор по открытым реестрам."));
        mvc.perform(get("/api/support/tickets/mine")).andExpect(status().isUnauthorized());
    }

    @Test
    void nonCriticalFieldsChangeImmediatelyCriticalOnlyThroughModerator() throws Exception {
        Account user = register("profile");
        String moderator = login("moderator@demo.ru");

        perform(patch("/api/me/profile"), user.token(), Map.of("city", "Кишинёв", "country", "Молдова", "jobTitle", "Тестировщик"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.city").value("Кишинёв"));

        // Внешние ссылки на картинки запрещены — только загруженные файлы
        perform(patch("/api/me/profile"), user.token(), Map.of("avatarUrl", "https://tracker.example/pixel.png"))
                .andExpect(status().isBadRequest());

        long requestId = body(perform(post("/api/me/profile/change-requests"), user.token(),
                Map.of("field", "DISPLAY_NAME", "newValue", "Новое Имя", "reason", "Опечатка при регистрации"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))).path("id").asLong();

        // Имя ещё не изменилось, повторная заявка по тому же полю — конфликт
        perform(get("/api/auth/me"), user.token(), null).andExpect(jsonPath("$.displayName").value("Тест profile"));
        perform(post("/api/me/profile/change-requests"), user.token(), Map.of("field", "DISPLAY_NAME", "newValue", "Другое Имя"))
                .andExpect(status().isConflict());

        perform(get("/api/moderation/profile-changes"), moderator, null)
                .andExpect(jsonPath("$[*].id", hasItem((int) requestId)));
        perform(post("/api/moderation/profile-changes/" + requestId + "/decision"), moderator, json("decision", "APPROVE"))
                .andExpect(jsonPath("$.status").value("APPROVED"));

        perform(get("/api/auth/me"), user.token(), null).andExpect(jsonPath("$.displayName").value("Новое Имя"));

        // Смена email на уже занятый адрес не принимается
        perform(post("/api/me/profile/change-requests"), user.token(), Map.of("field", "EMAIL", "newValue", "anna.k@demo.ru"))
                .andExpect(status().isConflict());
    }
}
