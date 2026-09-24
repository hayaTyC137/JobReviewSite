package com.jobreview.service;

import com.jobreview.dto.CandidateRatingDto;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Считает открытый рейтинг кандидатской активности (0–100).
 *
 * Правила специально простые и прозрачные — их расшифровка показывается прямо в карточке автора:
 *  - опубликованные отзывы: 10 баллов за отзыв, максимум 40;
 *  - стаж на платформе: 2 балла за полный месяц, максимум 20;
 *  - заполненный профиль: должность и город — по 10 баллов;
 *  - опыт в разных компаниях: 10 баллов, если отзывы о двух и более компаниях;
 *  - надёжность: 10 баллов, если ни один отзыв не был скрыт модератором, иначе минус 15 за каждый скрытый.
 */
@Component
public class CandidateRatingCalculator {

    private static final int POINTS_PER_REVIEW = 10;
    private static final int MAX_REVIEW_POINTS = 40;
    private static final int POINTS_PER_MONTH = 2;
    private static final int MAX_TENURE_POINTS = 20;
    private static final int PROFILE_FIELD_POINTS = 10;
    private static final int DIVERSITY_POINTS = 10;
    private static final int RELIABILITY_BONUS = 10;
    private static final int PENALTY_PER_HIDDEN = 15;

    /** Входные данные собраны в одну запись, чтобы калькулятор не зависел от JPA и легко тестировался */
    public record Input(long publishedReviews, long hiddenReviews, long distinctCompanies,
                        LocalDate memberSince, LocalDate today, boolean hasJobTitle, boolean hasCity) {
    }

    public CandidateRatingDto calculate(Input input) {
        List<CandidateRatingDto.Part> parts = new ArrayList<>();

        int reviewPoints = (int) Math.min(input.publishedReviews() * POINTS_PER_REVIEW, MAX_REVIEW_POINTS);
        parts.add(new CandidateRatingDto.Part("Опубликованные отзывы", reviewPoints, MAX_REVIEW_POINTS,
                input.publishedReviews() + " × " + POINTS_PER_REVIEW + " баллов"));

        long months = Math.max(0, ChronoUnit.MONTHS.between(input.memberSince(), input.today()));
        int tenurePoints = (int) Math.min(months * POINTS_PER_MONTH, MAX_TENURE_POINTS);
        parts.add(new CandidateRatingDto.Part("Стаж на платформе", tenurePoints, MAX_TENURE_POINTS,
                months + " мес. × " + POINTS_PER_MONTH + " балла"));

        int profilePoints = (input.hasJobTitle() ? PROFILE_FIELD_POINTS : 0) + (input.hasCity() ? PROFILE_FIELD_POINTS : 0);
        parts.add(new CandidateRatingDto.Part("Заполненный профиль", profilePoints, PROFILE_FIELD_POINTS * 2,
                "должность и город"));

        int diversityPoints = input.distinctCompanies() >= 2 ? DIVERSITY_POINTS : 0;
        parts.add(new CandidateRatingDto.Part("Опыт в разных компаниях", diversityPoints, DIVERSITY_POINTS,
                "компаний в отзывах: " + input.distinctCompanies()));

        int reliabilityPoints = input.hiddenReviews() == 0
                ? RELIABILITY_BONUS
                : (int) -(input.hiddenReviews() * PENALTY_PER_HIDDEN);
        parts.add(new CandidateRatingDto.Part("Надёжность", reliabilityPoints, RELIABILITY_BONUS,
                input.hiddenReviews() == 0 ? "нет скрытых отзывов" : "скрыто модератором: " + input.hiddenReviews()));

        int total = parts.stream().mapToInt(CandidateRatingDto.Part::points).sum();
        int score = Math.max(0, Math.min(100, total));
        return new CandidateRatingDto(score, levelFor(score), parts);
    }

    private String levelFor(int score) {
        if (score >= 85) {
            return "Эксперт сообщества";
        }
        if (score >= 60) {
            return "Надёжный автор";
        }
        if (score >= 30) {
            return "Активный участник";
        }
        return "Новичок";
    }
}
