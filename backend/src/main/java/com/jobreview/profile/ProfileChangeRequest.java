package com.jobreview.profile;

import com.jobreview.user.User;
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
 * Заявка на изменение критичных данных профиля. Такие поля влияют на доверие к отзывам
 * и на идентификацию сотрудника работодателями, поэтому меняются только после проверки модератором.
 */
@Entity
@Table(name = "profile_change_requests")
@Getter
@Setter
@NoArgsConstructor
public class ProfileChangeRequest {

    public enum Field {
        /** Публичное имя в отзывах */
        DISPLAY_NAME("Публичное имя"),
        /** ФИО — по нему работодатель идентифицирует сотрудника */
        FULL_NAME("ФИО"),
        /** Email — логин и канал связи */
        EMAIL("Email");

        private final String label;

        Field(String label) {
            this.label = label;
        }

        public String label() {
            return label;
        }
    }

    public enum Status {
        PENDING,
        APPROVED,
        REJECTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Field field;

    @Column(name = "old_value")
    private String oldValue;

    @Column(name = "new_value", nullable = false)
    private String newValue;

    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "moderator_id")
    private User moderator;

    @Column(name = "moderator_comment")
    private String moderatorComment;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
