package com.jobreview.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.jobreview.dto.CandidateRatingDto;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class CandidateRatingCalculatorTest {

    private final CandidateRatingCalculator calculator = new CandidateRatingCalculator();
    private final LocalDate today = LocalDate.of(2026, 9, 24);

    @Test
    void newUserWithoutReviewsGetsOnlyReliabilityBonus() {
        CandidateRatingDto rating = calculator.calculate(
                new CandidateRatingCalculator.Input(0, 0, 0, today, today, false, false));

        assertEquals(10, rating.score());
        assertEquals("Новичок", rating.level());
    }

    @Test
    void activeUserIsCappedByLimits() {
        // 6 отзывов дают 60, но максимум за отзывы — 40; 3 года стажа ограничены 20 баллами
        CandidateRatingDto rating = calculator.calculate(
                new CandidateRatingCalculator.Input(6, 0, 3, today.minusYears(3), today, true, true));

        assertEquals(40 + 20 + 20 + 10 + 10, rating.score());
        assertEquals("Эксперт сообщества", rating.level());
    }

    @Test
    void hiddenReviewsReduceScoreButNotBelowZero() {
        CandidateRatingDto rating = calculator.calculate(
                new CandidateRatingCalculator.Input(1, 3, 1, today, today, false, false));

        assertEquals(0, rating.score());
    }
}
