package com.jobreview.employee;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Метрики сотрудника от работодателя, каждая от 1 до 5.
 * Токсичность — единственная «обратная» шкала: 1 — не токсичен, 5 — очень токсичен.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationScores {

    @Column(nullable = false)
    private int toxicity;

    /** Уравновешенность, стрессоустойчивость */
    @Column(nullable = false)
    private int composure;

    @Column(nullable = false)
    private int productivity;

    /** Командная работа */
    @Column(nullable = false)
    private int teamwork;

    /** Надёжность: сроки, ответственность */
    @Column(nullable = false)
    private int reliability;

    @Column(nullable = false)
    private int communication;
}
