package com.jobreview;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Общая основа интеграционных тестов: один контекст Spring на все классы (быстро),
 * встроенная H2 с демо-данными. Тесты не зависят друг от друга: каждый, кому нужно менять данные,
 * регистрирует собственных пользователей с уникальными email.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTestSupport {

    protected static final String DEMO_PASSWORD = "demo12345";
    private static final AtomicInteger COUNTER = new AtomicInteger();

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper objectMapper;

    protected record Account(long id, String email, String token) {
    }

    protected String login(String email) throws Exception {
        return login(email, DEMO_PASSWORD);
    }

    protected String login(String email, String password) throws Exception {
        String response = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", email, "password", password)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return read(response).path("token").asText();
    }

    /** Новый пользователь с ролью USER и уникальным email */
    protected Account register(String prefix) throws Exception {
        String email = prefix + "-" + COUNTER.incrementAndGet() + "-" + UUID.randomUUID().toString().substring(0, 6) + "@test.local";
        String response = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", email, "password", "strongPass1", "displayName", "Тест " + prefix)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode node = read(response);
        return new Account(node.path("user").path("id").asLong(), email, node.path("token").asText());
    }

    protected ResultActions perform(MockHttpServletRequestBuilder request, String token, Object body) throws Exception {
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON)
                    .content(body instanceof String s ? s : objectMapper.writeValueAsString(body));
        }
        return mvc.perform(request);
    }

    protected JsonNode read(String body) throws Exception {
        return objectMapper.readTree(body);
    }

    protected JsonNode body(ResultActions actions) throws Exception {
        return read(actions.andReturn().getResponse().getContentAsString());
    }

    /** Короткая запись JSON-объекта из пар ключ-значение */
    protected String json(Object... pairs) throws Exception {
        var map = new java.util.LinkedHashMap<String, Object>();
        for (int i = 0; i < pairs.length; i += 2) {
            map.put((String) pairs[i], pairs[i + 1]);
        }
        return objectMapper.writeValueAsString(map);
    }
}
