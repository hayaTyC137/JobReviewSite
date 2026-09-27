package com.jobreview.user;

import com.jobreview.company.Company;
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

    /** Хэш BCrypt. У пользователей, вошедших через соцсети, пароля нет. */
    @Column(name = "password_hash")
    private String passwordHash;

    /** Публичное имя в отзывах, например «Анна К.» */
    @Column(name = "display_name", nullable = false)
    private String displayName;

    /** Полное ФИО — критичные данные: меняется только через модератора и публично не показывается */
    @Column(name = "full_name")
    private String fullName;

    @Column(name = "job_title")
    private String jobTitle;

    private String city;

    private String country;

    private String bio;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", nullable = false)
    private AuthProvider authProvider = AuthProvider.LOCAL;

    /** Компания, которую пользователь представляет (только для REPRESENTATIVE) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    /** Модератор проверил документы и подтвердил, что это действительно руководитель или HR */
    @Column(name = "representative_verified", nullable = false)
    private boolean representativeVerified;

    /** Заблокированный пользователь не может войти, а уже выданные токены перестают работать */
    @Column(nullable = false)
    private boolean blocked;

    @Column(name = "blocked_reason")
    private String blockedReason;

    /** Профиль дозаполнен после входа через соцсеть (для обычной регистрации — сразу true) */
    @Column(name = "profile_completed", nullable = false)
    private boolean profileCompleted = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    /** Может ли пользователь действовать от имени указанной компании */
    public boolean isVerifiedRepresentativeOf(Company target) {
        return role == Role.REPRESENTATIVE
                && representativeVerified
                && company != null
                && target != null
                && company.getId().equals(target.getId());
    }

    /** Подтверждённый представитель какой-либо компании */
    public boolean isVerifiedRepresentative() {
        return role == Role.REPRESENTATIVE && representativeVerified && company != null;
    }
}
