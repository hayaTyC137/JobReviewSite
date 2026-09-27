package com.jobreview.employee;

import com.jobreview.company.Company;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Запись трудовой истории: сотрудник работал (или работает) в компании на должности.
 * Заводит её подтверждённый представитель работодателя — так история не «придумывается» самим пользователем.
 */
@Entity
@Table(name = "employment_records")
@Getter
@Setter
@NoArgsConstructor
public class EmploymentRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id")
    private User employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(nullable = false)
    private String position;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    /** null — сотрудник работает до сих пор */
    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "dismissal_reason")
    private DismissalReason dismissalReason;

    @Column(name = "dismissal_note")
    private String dismissalNote;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recorded_by")
    private User recordedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public boolean isCurrent() {
        return endDate == null;
    }

    /** Стаж в полных месяцах на указанную дату */
    public long tenureMonths(LocalDate today) {
        LocalDate end = endDate == null ? today : endDate;
        return Math.max(0, ChronoUnit.MONTHS.between(startDate, end));
    }
}
