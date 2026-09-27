package com.jobreview.companypanel;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.jobreview.IntegrationTestSupport;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Регистрация новой компании: заявка в реестр → невидима в поиске → решение модератора →
 * публикация и подтверждение заявителя как представителя.
 */
class CompanyModerationIntegrationTest extends IntegrationTestSupport {

    private Map<String, Object> form(String name, String inn) {
        Map<String, Object> form = new LinkedHashMap<>();
        form.put("name", name);
        form.put("legalName", "SRL «" + name + "»");
        form.put("inn", inn);
        form.put("country", "Молдова");
        form.put("city", "Бельцы");
        form.put("industry", "Разработка ПО");
        form.put("website", "example.md");
        form.put("description", "Тестовая компания для проверки модерации.");
        return form;
    }

    @Test
    void newCompanyIsPublishedOnlyAfterModeratorApproval() throws Exception {
        Account founder = register("founder");
        String moderator = login("moderator@demo.ru");

        JsonNode panel = body(perform(post("/api/company-panel/company"), founder.token(), form("Bălți Soft Test", "1029600099001"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.company.status").value("PENDING"))
                .andExpect(jsonPath("$.canManage").value(false)));
        long companyId = panel.path("company").path("id").asLong();
        String slug = panel.path("company").path("slug").asText();

        // Заявитель стал неподтверждённым представителем
        perform(get("/api/auth/me"), founder.token(), null)
                .andExpect(jsonPath("$.role").value("REPRESENTATIVE"))
                .andExpect(jsonPath("$.representativeVerified").value(false))
                .andExpect(jsonPath("$.companyStatus").value("PENDING"));

        // До проверки компании нет ни в поиске, ни по прямой ссылке
        mvc.perform(get("/api/companies").param("q", "Bălți Soft Test"))
                .andExpect(jsonPath("$.items[*].slug", not(hasItem(slug))));
        mvc.perform(get("/api/companies/" + slug)).andExpect(status().isNotFound());

        // Пока заявка не одобрена, сотрудников вести нельзя
        perform(get("/api/company-panel/employees"), founder.token(), null).andExpect(status().isForbidden());

        // Заявка видна модератору
        perform(get("/api/moderation/companies"), moderator, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].slug", hasItem(slug)));

        // Отказ без причины не принимается
        perform(post("/api/moderation/companies/" + companyId + "/decision"), moderator, json("decision", "REJECT"))
                .andExpect(status().isConflict());

        perform(post("/api/moderation/companies/" + companyId + "/decision"), moderator,
                json("decision", "APPROVE", "comment", "Регистрационные данные сверены"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mvc.perform(get("/api/companies").param("q", "Bălți Soft Test"))
                .andExpect(jsonPath("$.items[*].slug", hasItem(slug)));
        mvc.perform(get("/api/companies/" + slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.representatives[0].id").value((int) founder.id()));
        perform(get("/api/company-panel"), founder.token(), null)
                .andExpect(jsonPath("$.canManage").value(true));

        // Повторное решение по той же заявке невозможно
        perform(post("/api/moderation/companies/" + companyId + "/decision"), moderator, json("decision", "REJECT", "comment", "x"))
                .andExpect(status().isConflict());
    }

    @Test
    void rejectedApplicationGoesBackToQueueAfterEditing() throws Exception {
        Account founder = register("rejected");
        String moderator = login("moderator@demo.ru");
        long companyId = body(perform(post("/api/company-panel/company"), founder.token(), form("Reject Me Test", null))
                .andExpect(status().isCreated())).path("company").path("id").asLong();

        perform(post("/api/moderation/companies/" + companyId + "/decision"), moderator,
                json("decision", "REJECT", "comment", "Не указан ИНН/IDNO"))
                .andExpect(jsonPath("$.status").value("REJECTED"));

        perform(get("/api/company-panel"), founder.token(), null)
                .andExpect(jsonPath("$.company.moderationComment").value("Не указан ИНН/IDNO"));

        perform(put("/api/company-panel/company"), founder.token(), form("Reject Me Test", "1029600099002"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.company.status").value("PENDING"));
    }

    @Test
    void companyFormIsValidatedAndOneCompanyPerUser() throws Exception {
        Account founder = register("validation");
        Map<String, Object> bad = form("Bad Test", "12ab");
        bad.put("website", "javascript:alert(1)");
        bad.put("logoUrl", "https://evil.example/tracker.png");
        perform(post("/api/company-panel/company"), founder.token(), bad)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.inn").exists())
                .andExpect(jsonPath("$.fieldErrors.website").exists())
                .andExpect(jsonPath("$.fieldErrors.logoUrl").exists());

        perform(post("/api/company-panel/company"), founder.token(), form("First Test", null)).andExpect(status().isCreated());
        perform(post("/api/company-panel/company"), founder.token(), form("Second Test", null)).andExpect(status().isConflict());

        // Модератор не может зарегистрировать компанию от своего имени
        perform(post("/api/company-panel/company"), login("moderator@demo.ru"), form("Staff Test", null))
                .andExpect(status().isForbidden());
    }
}
