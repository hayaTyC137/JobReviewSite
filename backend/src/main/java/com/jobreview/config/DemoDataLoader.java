package com.jobreview.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobreview.model.AuthProvider;
import com.jobreview.model.Company;
import com.jobreview.model.EmploymentStatus;
import com.jobreview.model.RatingScores;
import com.jobreview.model.Review;
import com.jobreview.model.ReviewStatus;
import com.jobreview.model.Role;
import com.jobreview.model.User;
import com.jobreview.repository.CompanyRepository;
import com.jobreview.repository.ReviewRepository;
import com.jobreview.repository.UserRepository;
import com.jobreview.service.CompanyRatingService;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Заполняет пустую базу демонстрационными данными из demo/companies.json.
 * Тот же файл использует фронтенд в демо-режиме без бэкенда, поэтому данные совпадают.
 * Отключается переменной окружения DEMO_DATA=false.
 */
@Component
@ConditionalOnProperty(name = "app.demo-data.enabled", havingValue = "true")
public class DemoDataLoader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataLoader.class);

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final CompanyRatingService ratingService;
    private final PasswordEncoder passwordEncoder;
    private final String demoPassword;

    public DemoDataLoader(CompanyRepository companyRepository, UserRepository userRepository,
                          ReviewRepository reviewRepository, CompanyRatingService ratingService,
                          PasswordEncoder passwordEncoder, @Value("${app.demo-data.password}") String demoPassword) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
        this.ratingService = ratingService;
        this.passwordEncoder = passwordEncoder;
        this.demoPassword = demoPassword;
    }

    // Структура JSON-файла. Записи здесь — просто «контейнеры» для Jackson.
    record DemoFile(List<DemoUser> users, List<DemoCompany> companies, List<DemoReview> reviews) {
    }

    record DemoUser(String key, String email, String displayName, String jobTitle, String city,
                    LocalDate createdAt, Role role, String company) {
    }

    record DemoCompany(String slug, String name, String legalName, String inn, String country, String city,
                       String legalAddress, String actualAddress, String phone, String email, String website,
                       String industry, Integer employeesCount, Integer foundedYear, String description) {
    }

    record DemoReview(String company, String author, EmploymentStatus employmentStatus, String position,
                      int overall, RatingScores scores, String text, LocalDate createdAt) {
    }

    @Override
    @Transactional
    public void run(String... args) throws IOException {
        if (companyRepository.count() > 0) {
            log.info("Демо-данные не загружаются: в базе уже есть компании");
            return;
        }

        DemoFile demo = readFile();
        Map<String, Company> companies = new HashMap<>();
        Map<String, User> users = new HashMap<>();

        for (DemoCompany dc : demo.companies()) {
            companies.put(dc.slug(), companyRepository.save(toCompany(dc)));
        }
        String passwordHash = passwordEncoder.encode(demoPassword);
        for (DemoUser du : demo.users()) {
            users.put(du.key(), userRepository.save(toUser(du, passwordHash, companies)));
        }
        for (DemoReview dr : demo.reviews()) {
            Review review = new Review();
            review.setCompany(companies.get(dr.company()));
            review.setAuthor(users.get(dr.author()));
            review.setEmploymentStatus(dr.employmentStatus());
            review.setPosition(dr.position());
            review.setOverallRating(dr.overall());
            review.setScores(dr.scores());
            review.setText(dr.text());
            review.setStatus(ReviewStatus.PUBLISHED);
            review.setCreatedAt(dr.createdAt().atTime(LocalTime.NOON));
            reviewRepository.save(review);
        }
        companies.values().forEach(ratingService::recalculate);

        log.info("Загружены демо-данные: {} компаний, {} пользователей, {} отзывов",
                companies.size(), users.size(), demo.reviews().size());
    }

    private DemoFile readFile() throws IOException {
        ObjectMapper mapper = new ObjectMapper()
                .findAndRegisterModules()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        try (InputStream in = new ClassPathResource("demo/companies.json").getInputStream()) {
            return mapper.readValue(in, DemoFile.class);
        }
    }

    private Company toCompany(DemoCompany dc) {
        Company c = new Company();
        c.setSlug(dc.slug());
        c.setName(dc.name());
        c.setLegalName(dc.legalName());
        c.setInn(dc.inn());
        c.setCountry(dc.country());
        c.setCity(dc.city());
        c.setLegalAddress(dc.legalAddress());
        c.setActualAddress(dc.actualAddress());
        c.setPhone(dc.phone());
        c.setEmail(dc.email());
        c.setWebsite(dc.website());
        c.setIndustry(dc.industry());
        c.setEmployeesCount(dc.employeesCount());
        c.setFoundedYear(dc.foundedYear());
        c.setDescription(dc.description());
        return c;
    }

    private User toUser(DemoUser du, String passwordHash, Map<String, Company> companies) {
        User u = new User();
        u.setEmail(du.email());
        u.setPasswordHash(passwordHash);
        u.setDisplayName(du.displayName());
        u.setJobTitle(du.jobTitle());
        u.setCity(du.city());
        u.setRole(du.role() == null ? Role.USER : du.role());
        u.setAuthProvider(AuthProvider.LOCAL);
        u.setCreatedAt(du.createdAt().atStartOfDay());
        if (du.company() != null) {
            u.setCompany(companies.get(du.company()));
            u.setRepresentativeVerified(true);
        }
        return u;
    }
}
