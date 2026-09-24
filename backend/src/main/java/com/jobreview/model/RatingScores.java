package com.jobreview.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Оценки одного отзыва по критериям (каждая от 1 до 5).
 * Вынесены во встраиваемый класс, чтобы не раздувать сущность Review.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RatingScores {

    /** Психологический климат */
    @Column(nullable = false)
    private int climate;

    /** Руководство */
    @Column(nullable = false)
    private int management;

    /** Коллектив */
    @Column(nullable = false)
    private int team;

    /** Условия и расположение офиса */
    @Column(nullable = false)
    private int office;

    /** Работа с клиентами */
    @Column(nullable = false)
    private int clients;

    /** Карьерный рост и обучение */
    @Column(nullable = false)
    private int growth;
}
