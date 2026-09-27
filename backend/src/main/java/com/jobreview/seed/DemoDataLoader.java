package com.jobreview.seed;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobreview.company.Company;
import com.jobreview.company.CompanyRatingService;
import com.jobreview.company.CompanyRepository;
import com.jobreview.company.CompanyStatus;
import com.jobreview.complaint.Complaint;
import com.jobreview.complaint.ComplaintRepository;
import com.jobreview.employee.DisciplinaryRecord;
import com.jobreview.employee.DisciplinaryRecordRepository;
import com.jobreview.employee.DismissalReason;
import com.jobreview.employee.EmployeeEvaluation;
import com.jobreview.employee.EmployeeEvaluationRepository;
import com.jobreview.employee.EmploymentRecord;
import com.jobreview.employee.EmploymentRecordRepository;
import com.jobreview.employee.EvaluationScores;
import com.jobreview.profile.ProfileChangeRequest;
import com.jobreview.profile.ProfileChangeRequestRepository;
import com.jobreview.review.EmploymentStatus;
import com.jobreview.review.RatingScores;
import com.jobreview.review.Review;
import com.jobreview.review.ReviewRepository;
import com.jobreview.review.ReviewStatus;
import com.jobreview.support.SupportTicket;
import com.jobreview.support.SupportTicketRepository;
import com.jobreview.user.AuthProvider;
import com.jobreview.user.Role;
import com.jobreview.user.User;
import com.jobreview.user.UserRepository;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
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
 * Кроме каталога загружаются трудовая история, оценки работодателей, дисциплина и заявки
 * во всех очередях модерации — чтобы каждый кабинет было что показать сразу после запуска.
 * Отключается переменной окружения DEMO_DATA=false.
 */
@Component
@ConditionalOnProperty(name = "app.demo-data.enabled", havingValue = "true")
public class DemoDataLoader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataLoader.class);
    private static final LocalDate LOADED_COMPANIES_SINCE = LocalDate.of(2024, 1, 15);

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final CompanyRatingService ratingService;
    private final EmploymentRecordRepository employmentRepository;
    private final EmployeeEvaluationRepository evaluationRepository;
    private final DisciplinaryRecordRepository disciplineRepository;
    private final ComplaintRepository complaintRepository;
    private final SupportTicketRepository ticketRepository;
    private final ProfileChangeRequestRepository profileChangeRepository;
    private final PasswordEncoder passwordEncoder;
    private final String demoPassword;

    public DemoDataLoader(CompanyRepository companyRepository, UserRepository userRepository,
                          ReviewRepository reviewRepository, CompanyRatingService ratingService,
                          EmploymentRecordRepository employmentRepository,
                          EmployeeEvaluationRepository evaluationRepository,
                          DisciplinaryRecordRepository disciplineRepository, ComplaintRepository complaintRepository,
                          SupportTicketRepository ticketRepository,
                          ProfileChangeRequestRepository profileChangeRepository,
                          PasswordEncoder passwordEncoder, @Value("${app.demo-data.password}") String demoPassword) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
        this.ratingService = ratingService;
        this.employmentRepository = employmentRepository;
        this.evaluationRepository = evaluationRepository;
        this.disciplineRepository = disciplineRepository;
        this.complaintRepository = complaintRepository;
        this.ticketRepository = ticketRepository;
        this.profileChangeRepository = profileChangeRepository;
        this.passwordEncoder = passwordEncoder;
        this.demoPassword = demoPassword;
    }

    // Структура JSON-файла. Записи здесь — просто «контейнеры» для Jackson.
    record DemoFile(List<DemoUser> users, List<DemoCompany> companies, List<DemoReview> reviews,
                    List<DemoEmployment> employment, List<DemoDiscipline> discipline, List<DemoComplaint> complaints,
                    List<DemoTicket> tickets, List<DemoProfileChange> profileChanges) {
    }

    record DemoUser(String key, String email, String displayName, String fullName, String jobTitle, String city,
                    String country, LocalDate createdAt, Role role, String company, Boolean verified) {
    }

    record DemoCompany(String slug, String name, String legalName, String inn, String country, String city,
                       String legalAddress, String actualAddress, String phone, String email, String website,
                       String industry, Integer employeesCount, Integer foundedYear, String description,
                       CompanyStatus status, String createdBy, LocalDate createdAt) {
    }

    record DemoReview(String company, String author, EmploymentStatus employmentStatus, String position,
                      int overall, RatingScores scores, String text, LocalDate createdAt) {
    }

    record DemoEvaluation(int toxicity, int composure, int productivity, int teamwork, int reliability,
                          int communication, String comment) {
    }

    record DemoEmployment(String employee, String company, String recordedBy, String position, LocalDate startDate,
                          LocalDate endDate, DismissalReason dismissalReason, String dismissalNote,
                          DemoEvaluation evaluation) {
    }

    record DemoDiscipline(String employee, String company, String reportedBy, DisciplinaryRecord.Severity severity,
                          String title, String description, LocalDate occurredOn, DisciplinaryRecord.Status status,
                          String moderatorComment) {
    }

    record DemoReviewRef(String company, int index) {
    }

    record DemoComplaint(String author, Complaint.TargetType targetType, DemoReviewRef review, String user,
                         Complaint.Reason reason, String details) {
    }

    record DemoTicket(String user, String guestName, String guestEmail, SupportTicket.Topic topic, String subject,
                      String message, SupportTicket.Status status, String response, LocalDate createdAt) {
    }

    record DemoProfileChange(String user, ProfileChangeRequest.Field field, String newValue, String reason,
                             LocalDate createdAt) {
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
        Map<String, List<Review>> reviewsByCompany = new HashMap<>();

        for (DemoCompany dc : demo.companies()) {
            companies.put(dc.slug(), companyRepository.save(toCompany(dc)));
        }
        String passwordHash = passwordEncoder.encode(demoPassword);
        for (DemoUser du : demo.users()) {
            users.put(du.key(), userRepository.save(toUser(du, passwordHash, companies)));
        }
        // Заявки в реестр ссылаются на заявителя — связываем после создания пользователей
        for (DemoCompany dc : demo.companies()) {
            if (dc.createdBy() != null) {
                companies.get(dc.slug()).setCreatedBy(users.get(dc.createdBy()));
            }
        }
        for (DemoReview dr : demo.reviews()) {
            Review review = reviewRepository.save(toReview(dr, companies, users));
            reviewsByCompany.computeIfAbsent(dr.company(), k -> new ArrayList<>()).add(review);
        }
        companies.values().forEach(ratingService::recalculate);

        loadEmployment(orEmpty(demo.employment()), companies, users);
        loadDiscipline(orEmpty(demo.discipline()), companies, users);
        loadComplaints(orEmpty(demo.complaints()), users, reviewsByCompany);
        loadTickets(orEmpty(demo.tickets()), users);
        loadProfileChanges(orEmpty(demo.profileChanges()), users);

        log.info("Загружены демо-данные: {} компаний, {} пользователей, {} отзывов, {} записей трудовой истории",
                companies.size(), users.size(), demo.reviews().size(), orEmpty(demo.employment()).size());
    }

    private void loadEmployment(List<DemoEmployment> list, Map<String, Company> companies, Map<String, User> users) {
        for (DemoEmployment de : list) {
            EmploymentRecord record = new EmploymentRecord();
            record.setEmployee(users.get(de.employee()));
            record.setCompany(companies.get(de.company()));
            record.setRecordedBy(users.get(de.recordedBy()));
            record.setPosition(de.position());
            record.setStartDate(de.startDate());
            record.setEndDate(de.endDate());
            record.setDismissalReason(de.dismissalReason());
            record.setDismissalNote(de.dismissalNote());
            record.setCreatedAt(de.startDate().atTime(LocalTime.NOON));
            employmentRepository.save(record);

            DemoEvaluation ev = de.evaluation();
            if (ev != null) {
                EmployeeEvaluation evaluation = new EmployeeEvaluation();
                evaluation.setEmployment(record);
                evaluation.setAuthor(users.get(de.recordedBy()));
                evaluation.setScores(new EvaluationScores(ev.toxicity(), ev.composure(), ev.productivity(),
                        ev.teamwork(), ev.reliability(), ev.communication()));
                evaluation.setComment(ev.comment());
                evaluationRepository.save(evaluation);
            }
        }
    }

    private void loadDiscipline(List<DemoDiscipline> list, Map<String, Company> companies, Map<String, User> users) {
        User moderator = users.get("moderator");
        for (DemoDiscipline dd : list) {
            DisciplinaryRecord record = new DisciplinaryRecord();
            record.setEmployee(users.get(dd.employee()));
            record.setCompany(companies.get(dd.company()));
            record.setReportedBy(users.get(dd.reportedBy()));
            record.setSource(DisciplinaryRecord.Source.EMPLOYER);
            record.setSeverity(dd.severity());
            record.setTitle(dd.title());
            record.setDescription(dd.description());
            record.setOccurredOn(dd.occurredOn());
            record.setStatus(dd.status());
            record.setCreatedAt(dd.occurredOn().plusDays(3).atTime(LocalTime.NOON));
            if (dd.status() != DisciplinaryRecord.Status.PENDING) {
                record.setModerator(moderator);
                record.setModeratorComment(dd.moderatorComment());
                record.setResolvedAt(dd.occurredOn().plusDays(10).atTime(LocalTime.NOON));
            }
            disciplineRepository.save(record);
        }
    }

    private void loadComplaints(List<DemoComplaint> list, Map<String, User> users, Map<String, List<Review>> reviews) {
        for (DemoComplaint dc : list) {
            Complaint complaint = new Complaint();
            complaint.setAuthor(users.get(dc.author()));
            complaint.setTargetType(dc.targetType());
            complaint.setTargetId(dc.targetType() == Complaint.TargetType.REVIEW
                    ? reviews.get(dc.review().company()).get(dc.review().index()).getId()
                    : users.get(dc.user()).getId());
            complaint.setReason(dc.reason());
            complaint.setDetails(dc.details());
            complaintRepository.save(complaint);
        }
    }

    private void loadTickets(List<DemoTicket> list, Map<String, User> users) {
        User moderator = users.get("moderator");
        for (DemoTicket dt : list) {
            SupportTicket ticket = new SupportTicket();
            User user = dt.user() == null ? null : users.get(dt.user());
            ticket.setUser(user);
            ticket.setName(user != null ? user.getDisplayName() : dt.guestName());
            ticket.setEmail(user != null ? user.getEmail() : dt.guestEmail());
            ticket.setTopic(dt.topic());
            ticket.setSubject(dt.subject());
            ticket.setMessage(dt.message());
            ticket.setStatus(dt.status());
            ticket.setResponse(dt.response());
            ticket.setHandledBy(dt.status() == SupportTicket.Status.NEW ? null : moderator);
            ticket.setCreatedAt(dt.createdAt().atTime(LocalTime.NOON));
            ticket.setUpdatedAt(dt.createdAt().plusDays(1).atTime(LocalTime.NOON));
            ticketRepository.save(ticket);
        }
    }

    private void loadProfileChanges(List<DemoProfileChange> list, Map<String, User> users) {
        for (DemoProfileChange dp : list) {
            User user = users.get(dp.user());
            ProfileChangeRequest change = new ProfileChangeRequest();
            change.setUser(user);
            change.setField(dp.field());
            change.setOldValue(switch (dp.field()) {
                case DISPLAY_NAME -> user.getDisplayName();
                case FULL_NAME -> user.getFullName();
                case EMAIL -> user.getEmail();
            });
            change.setNewValue(dp.newValue());
            change.setReason(dp.reason());
            change.setCreatedAt(dp.createdAt().atTime(LocalTime.NOON));
            profileChangeRepository.save(change);
        }
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
        c.setStatus(dc.status() == null ? CompanyStatus.APPROVED : dc.status());
        // Дата появления в реестре: у заявок — из файла, у давно опубликованных — условный старт платформы
        c.setCreatedAt((dc.createdAt() != null ? dc.createdAt() : LOADED_COMPANIES_SINCE).atTime(LocalTime.NOON));
        return c;
    }

    private User toUser(DemoUser du, String passwordHash, Map<String, Company> companies) {
        User u = new User();
        u.setEmail(du.email());
        u.setPasswordHash(passwordHash);
        u.setDisplayName(du.displayName());
        u.setFullName(du.fullName());
        u.setJobTitle(du.jobTitle());
        u.setCity(du.city());
        u.setCountry(du.country());
        u.setRole(du.role() == null ? Role.USER : du.role());
        u.setAuthProvider(AuthProvider.LOCAL);
        u.setCreatedAt(du.createdAt().atStartOfDay());
        if (du.company() != null) {
            u.setCompany(companies.get(du.company()));
            u.setRepresentativeVerified(du.verified() == null || du.verified());
        }
        return u;
    }

    private static Review toReview(DemoReview dr, Map<String, Company> companies, Map<String, User> users) {
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
        return review;
    }

    private static <T> List<T> orEmpty(List<T> list) {
        return list == null ? List.of() : list;
    }
}
