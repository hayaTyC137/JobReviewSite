package com.jobreview;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/**
 * Сквозной сценарий на встроенной БД с демо-данными:
 * публичный поиск → вход → отзыв → обжалование → решение модератора.
 */
class ApiFlowIntegrationTest extends IntegrationTestSupport {

    private static final String REVIEW_BODY = """
            {"employmentStatus":"CURRENT","position":"Дизайнер","overall":4,
             "scores":{"climate":4,"management":4,"team":5,"office":4,"clients":3,"growth":4},
             "text":"Хорошая команда, понятные задачи и честная обратная связь от руководителя."}
            """;

    @Test
    void publicSearchWorksWithoutToken() throws Exception {
        mvc.perform(get("/api/companies").param("country", "Россия").param("minTeam", "4").param("sort", "RATING_ASC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.items[0].latestReview", notNullValue()))
                .andExpect(jsonPath("$.items[0].rating.criteria.team", notNullValue()));

        mvc.perform(get("/api/companies/nova-studio"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.representative.displayName").value("Ирина Лебедева"))
                .andExpect(jsonPath("$.representatives", hasSize(1)));

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
    void moldovaIsInLocationDirectoryAndSearch() throws Exception {
        mvc.perform(get("/api/locations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.countries", hasItem("Молдова")))
                .andExpect(jsonPath("$.cities[?(@.city == 'Кишинёв')].companiesCount", hasItem(greaterThan(0))))
                // Город из справочника без компаний тоже доступен в форме
                .andExpect(jsonPath("$.cities[?(@.city == 'Комрат')].companiesCount", hasItem(0)));

        mvc.perform(get("/api/companies").param("country", "Молдова").param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].slug", hasItem("codru-digital")))
                // Заявки на модерации в поиск не попадают
                .andExpect(jsonPath("$.items[*].slug", not(hasItem("orhei-agro"))));

        mvc.perform(get("/api/companies/orhei-agro")).andExpect(status().isNotFound());
        mvc.perform(get("/api/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companies", greaterThanOrEqualTo(17)))
                .andExpect(jsonPath("$.countries", greaterThanOrEqualTo(4)));
    }

    @Test
    void writingReviewRequiresAuthenticationAndRespectsAntiFraudRules() throws Exception {
        mvc.perform(post("/api/companies/nova-studio/reviews").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());

        String token = login("anna.k@demo.ru");
        perform(post("/api/companies/kedr-logistic/reviews"), token, REVIEW_BODY)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.author.displayName").value("Анна К."));

        // Повторный отзыв о той же компании раньше чем через 90 дней отклоняется
        perform(post("/api/companies/kedr-logistic/reviews"), token, REVIEW_BODY.replace("Хорошая", "Отличная"))
                .andExpect(status().isConflict());

        // Представитель не может оценивать свою компанию, модератор — писать отзывы вообще
        perform(post("/api/companies/nova-studio/reviews"), login("ceo@nova.demo"), REVIEW_BODY)
                .andExpect(status().isForbidden());
        perform(post("/api/companies/lumina-health/reviews"), login("moderator@demo.ru"), REVIEW_BODY)
                .andExpect(status().isForbidden());
    }

    @Test
    void representativeAppealsAndModeratorHidesReview() throws Exception {
        JsonNode reviews = read(mvc.perform(get("/api/companies/nova-studio/reviews").param("size", "1"))
                .andReturn().getResponse().getContentAsString());
        long reviewId = reviews.path("items").get(0).path("id").asLong();
        long authorId = reviews.path("items").get(0).path("author").path("id").asLong();
        String appealBody = "{\"reason\":\"Автор не работал у нас в указанный период времени.\"}";

        // Обычный пользователь обжаловать не может
        perform(post("/api/reviews/" + reviewId + "/appeals"), login("anna.k@demo.ru"), appealBody)
                .andExpect(status().isForbidden());

        JsonNode appeal = body(perform(post("/api/reviews/" + reviewId + "/appeals"), login("ceo@nova.demo"), appealBody)
                .andExpect(status().isCreated()));

        mvc.perform(get("/api/companies/nova-studio/reviews").param("size", "1"))
                .andExpect(jsonPath("$.items[0].status").value("UNDER_APPEAL"))
                .andExpect(jsonPath("$.items[0].pendingAppeal.representativeName").value("Ирина Лебедева"));

        perform(post("/api/moderation/appeals/" + appeal.path("id").asLong() + "/decision"), login("moderator@demo.ru"),
                "{\"decision\":\"APPROVE\",\"comment\":\"Факт трудоустройства не подтверждён\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mvc.perform(get("/api/companies/nova-studio/reviews").param("size", "1"))
                .andExpect(jsonPath("$.items[0].id").value(not((int) reviewId)));

        mvc.perform(get("/api/users/" + authorId + "/card"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candidateRating.parts", hasSize(5)));
    }
}
