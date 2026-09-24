package com.jobreview.model;

import jakarta.persistence.Column;
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
 * Пользователь платформы. Один класс на все роли — роль хранится в поле role.
 * Для представителя компании дополнительно заполнены company и representativeVerified.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    /** Хэш BCrypt. У пользователей, вошедших через Google, пароля нет. */
    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "job_title")
    private String jobTitle;

    private String city;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", nullable = false)
    private AuthProvider authProvider = AuthProvider.LOCAL;

    /** Компания, которую пользователь официально представляет (только для REPRESENTATIVE) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    /** Модератор проверил документы и подтвердил, что это действительно руководитель */
    @Column(name = "representative_verified", nullable = false)
    private boolean representativeVerified;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Может ли пользователь действовать от имени указанной компании */
    public boolean isVerifiedRepresentativeOf(Company target) {
        return role == Role.REPRESENTATIVE
                && representativeVerified
                && company != null
                && target != null
                && company.getId().equals(target.getId());
    }
}
