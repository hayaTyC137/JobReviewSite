package com.jobreview.employee;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jobreview.IntegrationTestSupport;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Кабинет сотрудника и панель работодателя: трудовая история, оценка, замечание, видимость карточки.
 */
class EmployeeCabinetIntegrationTest extends IntegrationTestSupport {

    @Test
    void demoEmployeeSeesScoreHistoryAndDiscipline() throws Exception {
        perform(get("/api/me/employee-profile"), login("anna.k@demo.ru"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownProfile").value(true))
                .andExpect(jsonPath("$.score.score", notNullValue()))
                .andExpect(jsonPath("$.score.metrics.length()").value(6))
                .andExpect(jsonPath("$.history.length()").value(2))
                .andExpect(jsonPath("$.history[1].dismissalReasonLabel").value("По собственному желанию"))
                .andExpect(jsonPath("$.discipline[0].status").value("CONFIRMED"))
                .andExpect(jsonPath("$.score.disciplinePenalty").value(5));
    }

    @Test
    void employerRecordsEmploymentEvaluatesAndReportsDiscipline() throws Exception {
        Account employee = register("employee");
        String employer = login("hr@codru.demo");
        String moderator = login("moderator@demo.ru");

        long recordId = body(perform(post("/api/company-panel/employees"), employer,
                Map.of("email", employee.email(), "position", "Support Engineer", "startDate", "2024-01-15"))
                .andExpect(status().isCreated())).path("recordId").asLong();

        // Увольнение без официальной причины не принимается
        perform(put("/api/company-panel/employees/" + recordId), employer,
                Map.of("position", "Support Engineer", "startDate", "2024-01-15", "endDate", "2025-02-28"))
                .andExpect(status().isBadRequest());
        perform(put("/api/company-panel/employees/" + recordId), employer,
                Map.of("position", "Support Engineer", "startDate", "2024-01-15", "endDate", "2025-02-28", "dismissalReason", "MUTUAL_AGREEMENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dismissalReason").value("MUTUAL_AGREEMENT"));

        perform(put("/api/company-panel/employees/" + recordId + "/evaluation"), employer,
                Map.of("scores", Map.of("toxicity", 1, "composure", 5, "productivity", 5, "teamwork", 5, "reliability", 5, "communication", 5),
                        "comment", "Отличный специалист поддержки."))
                .andExpect(status().isOk());

        long disciplineId = body(perform(post("/api/company-panel/employees/" + recordId + "/discipline"), employer,
                Map.of("severity", "REMARK", "title", "Опоздание на смену", "description", "Опоздал на ночную смену на два часа без предупреждения.",
                        "occurredOn", "2024-06-10"))
                .andExpect(status().isCreated())).path("id").asLong();

        // Пока модератор не подтвердил замечание, оно видно сотруднику, но не влияет на рейтинг
        perform(get("/api/me/employee-profile"), employee.token(), null)
                .andExpect(jsonPath("$.score.score").value(100))
                .andExpect(jsonPath("$.discipline[0].status").value("PENDING"));

        perform(post("/api/moderation/discipline/" + disciplineId + "/decision"), moderator, json("decision", "APPROVE"))
                .andExpect(status().isOk());

        perform(get("/api/employees/" + employee.id()), employer, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownProfile").value(false))
                .andExpect(jsonPath("$.score.score").value(95))
                .andExpect(jsonPath("$.history[0].companyName").value("Codru Digital"));
    }

    @Test
    void employeeCardIsNotPublic() throws Exception {
        Account stranger = register("stranger");
        long annaId = body(perform(get("/api/auth/me"), login("anna.k@demo.ru"), null)).path("id").asLong();

        mvc.perform(get("/api/employees/" + annaId)).andExpect(status().isUnauthorized());
        perform(get("/api/employees/" + annaId), stranger.token(), null).andExpect(status().isForbidden());
        perform(get("/api/employees/" + annaId), login("moderator@demo.ru"), null).andExpect(status().isOk());

        // Представитель не может вести собственную историю и чужих сотрудников
        perform(post("/api/company-panel/employees"), login("hr@codru.demo"),
                Map.of("email", "hr@codru.demo", "position", "HR", "startDate", "2023-01-01"))
                .andExpect(status().isForbidden());
        perform(post("/api/company-panel/employees"), stranger.token(),
                Map.of("email", "anna.k@demo.ru", "position", "X", "startDate", "2023-01-01"))
                .andExpect(status().isNotFound());
    }

    @Test
    void complaintAboutUserUpheldAddsConfirmedDisciplineRecord() throws Exception {
        Account reporter = register("reporter");
        Account offender = register("offender");
        String moderator = login("moderator@demo.ru");

        long complaintId = body(perform(post("/api/complaints"), reporter.token(),
                Map.of("targetType", "USER", "targetId", offender.id(), "reason", "OFFENSIVE",
                        "details", "Оскорбляет участников в комментариях к отзывам."))
                .andExpect(status().isCreated())).path("id").asLong();

        // Дубликат открытой жалобы и жалоба на себя запрещены
        perform(post("/api/complaints"), reporter.token(),
                Map.of("targetType", "USER", "targetId", offender.id(), "reason", "OFFENSIVE", "details", "Повторная жалоба на того же пользователя."))
                .andExpect(status().isConflict());
        perform(post("/api/complaints"), reporter.token(),
                Map.of("targetType", "USER", "targetId", reporter.id(), "reason", "OTHER", "details", "Жалоба на самого себя для проверки."))
                .andExpect(status().isForbidden());

        perform(get("/api/moderation/complaints"), moderator, null)
                .andExpect(jsonPath("$[*].id", hasItem((int) complaintId)));
        perform(post("/api/moderation/complaints/" + complaintId + "/decision"), moderator,
                json("decision", "APPROVE", "comment", "Подтверждено скриншотами"))
                .andExpect(jsonPath("$.status").value("UPHELD"));

        perform(get("/api/me/employee-profile"), offender.token(), null)
                .andExpect(jsonPath("$.discipline[0].source").value("COMPLAINT"))
                .andExpect(jsonPath("$.discipline[0].status").value("CONFIRMED"));
        perform(get("/api/complaints/mine"), reporter.token(), null)
                .andExpect(jsonPath("$[0].status").value("UPHELD"));
    }
}
