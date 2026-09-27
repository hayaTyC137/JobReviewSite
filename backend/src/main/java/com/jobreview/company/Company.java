package com.jobreview.company;

import com.jobreview.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Организация-работодатель: юридические и фактические сведения, оформление профиля,
 * статус в реестре и сводный рейтинг.
 */
@Entity
@Table(name = "companies")
@Getter
@Setter
@NoArgsConstructor
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Человекочитаемый идентификатор для URL, например nova-studio */
    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Column(name = "legal_name", nullable = false)
    private String legalName;

    private String inn;

    @Column(nullable = false)
    private String country;

    @Column(nullable = false)
    private String city;

    @Column(name = "legal_address")
    private String legalAddress;

    @Column(name = "actual_address")
    private String actualAddress;

    private String phone;
    private String email;
    private String website;
    private String industry;

    @Column(name = "employees_count")
    private Integer employeesCount;

    @Column(name = "founded_year")
    private Integer foundedYear;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "banner_url")
    private String bannerUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CompanyStatus status = CompanyStatus.APPROVED;

    /** Кто подал заявку на добавление компании в реестр */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** Комментарий модератора к последнему решению (причина отказа и т.п.) */
    @Column(name = "moderation_comment")
    private String moderationComment;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Embedded
    private CompanyRating rating = new CompanyRating();

    public boolean isPublished() {
        return status == CompanyStatus.APPROVED;
    }
}
