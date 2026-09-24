package com.jobreview;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Сквозной сценарий на встроенной БД с демо-данными:
 * публичный поиск → вход → отзыв → обжалование → решение модератора.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext
class ApiFlowIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void publicSearchWorksWithoutToken() throws Exception {
        mvc.perform(get("/api/companies").param("country", "Россия").param("minTeam", "4").param("sort", "RATING_ASC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.items[0].latestReview", notNullValue()))
                .andExpect(jsonPath("$.items[0].rating.criteria.team", notNullValue()));

        mvc.perform(get("/api/companies/nova-studio"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.representative.displayName").value("Ирина Лебедева"));

        mvc.perform(get("/api/companies/nova-studio/analytics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthlyTrend", hasSize(12)))
                .andExpect(jsonPath("$.distribution", hasSize(5)));

        mvc.perform(get("/api/companies/unknown"))
                .andExpect(status().isNotFound());

        // Swagger-документация доступна без токена
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth", notNullValue()));
    }

    @Test
    void writingReviewRequiresAuthentication() throws Exception {
        mvc.perform(post("/api/companies/nova-studio/reviews").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());

        String token = login("anna.k@demo.ru");
        String body = """
                {"employmentStatus":"CURRENT","position":"Дизайнер","overall":4,
                 "scores":{"climate":4,"management":4,"team":5,"office":4,"clients":3,"growth":4},
                 "text":"Хорошая команда, понятные задачи и честная обратная связь от руководителя."}
                """;
        mvc.perform(post("/api/companies/mosaic-studio/reviews").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.author.displayName").value("Анна К."));
    }

    @Test
    void representativeAppealsAndModeratorHidesReview() throws Exception {
        JsonNode reviews = json(mvc.perform(get("/api/companies/nova-studio/reviews").param("size", "1"))
                .andReturn().getResponse().getContentAsString());
        long reviewId = reviews.path("items").get(0).path("id").asLong();
        long authorId = reviews.path("items").get(0).path("author").path("id").asLong();

        // Обычный пользователь обжаловать не может
        String userToken = login("anna.k@demo.ru");
        mvc.perform(post("/api/reviews/" + reviewId + "/appeals").header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Автор не работал у нас в указанный период времени.\"}"))
                .andExpect(status().isForbidden());

        String ceoToken = login("ceo@nova.demo");
        JsonNode appeal = json(mvc.perform(post("/api/reviews/" + reviewId + "/appeals")
                        .header("Authorization", "Bearer " + ceoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Автор не работал у нас в указанный период времени.\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());

        mvc.perform(get("/api/companies/nova-studio/reviews").param("size", "1"))
                .andExpect(jsonPath("$.items[0].status").value("UNDER_APPEAL"))
                .andExpect(jsonPath("$.items[0].pendingAppeal.representativeName").value("Ирина Лебедева"));

        String moderatorToken = login("moderator@demo.ru");
        mvc.perform(post("/api/moderation/appeals/" + appeal.path("id").asLong() + "/decision")
                        .header("Authorization", "Bearer " + moderatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVE\",\"comment\":\"Факт трудоустройства не подтверждён\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mvc.perform(get("/api/companies/nova-studio/reviews").param("size", "1"))
                .andExpect(jsonPath("$.items[0].id").value(org.hamcrest.Matchers.not((int) reviewId)));

        mvc.perform(get("/api/users/" + authorId + "/card"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candidateRating.parts", hasSize(5)));
    }

    private String login(String email) throws Exception {
        String response = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"demo12345\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json(response).path("token").asText();
    }

    private JsonNode json(String body) throws Exception {
        return objectMapper.readTree(body);
    }
}
