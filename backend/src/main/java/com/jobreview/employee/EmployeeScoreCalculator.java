package com.jobreview.employee;

import java.util.ArrayList;
import java.util.List;
import java.util.function.ToIntFunction;
import org.springframework.stereotype.Component;

/**
 * Итоговый рейтинг сотрудника (0–100) по оценкам работодателей.
 *
 * Формула открытая и показывается прямо в карточке:
 *  1. каждая оценка сводится к среднему по шести метрикам (токсичность переворачивается: 6 − значение);
 *  2. берётся среднее по всем видимым оценкам и переводится в шкалу 0–100: (x − 1) / 4 × 100;
 *  3. за каждую подтверждённую модератором дисциплинарную запись — минус 5 баллов, но не больше 25.
 */
@Component
public class EmployeeScoreCalculator {

    static final int PENALTY_PER_RECORD = 5;
    static final int MAX_PENALTY = 25;

    private record MetricDef(String key, String label, boolean inverted, ToIntFunction<EvaluationScores> getter) {
    }

    private static final List<MetricDef> METRICS = List.of(
            new MetricDef("toxicity", "Токсичность", true, EvaluationScores::getToxicity),
            new MetricDef("composure", "Уравновешенность", false, EvaluationScores::getComposure),
            new MetricDef("productivity", "Продуктивность", false, EvaluationScores::getProductivity),
            new MetricDef("teamwork", "Командная работа", false, EvaluationScores::getTeamwork),
            new MetricDef("reliability", "Надёжность", false, EvaluationScores::getReliability),
            new MetricDef("communication", "Коммуникация", false, EvaluationScores::getCommunication));

    public EmployeeScoreDto calculate(List<EvaluationScores> evaluations, long confirmedDisciplineRecords) {
        List<EmployeeScoreDto.Metric> metrics = new ArrayList<>();
        for (MetricDef def : METRICS) {
            Double average = evaluations.isEmpty() ? null
                    : round1(evaluations.stream().mapToInt(def.getter()).average().orElse(0));
            metrics.add(new EmployeeScoreDto.Metric(def.key(), def.label(), average, def.inverted()));
        }

        int penalty = (int) Math.min(MAX_PENALTY, confirmedDisciplineRecords * PENALTY_PER_RECORD);
        if (evaluations.isEmpty()) {
            return new EmployeeScoreDto(null, "Нет оценок работодателей", 0, metrics, penalty);
        }

        double base = evaluations.stream().mapToDouble(EmployeeScoreCalculator::normalized).average().orElse(1);
        double percent = (base - 1) / 4 * 100;
        int score = (int) Math.max(0, Math.min(100, Math.round(percent - penalty)));
        return new EmployeeScoreDto(score, levelFor(score), evaluations.size(), metrics, penalty);
    }

    /** Одна оценка в шкале 1–5, где 5 — лучшее по всем метрикам */
    static double normalized(EvaluationScores s) {
        return ((6 - s.getToxicity()) + s.getComposure() + s.getProductivity() + s.getTeamwork()
                + s.getReliability() + s.getCommunication()) / 6.0;
    }

    private static String levelFor(int score) {
        if (score >= 85) {
            return "Образцовый сотрудник";
        }
        if (score >= 70) {
            return "Надёжный специалист";
        }
        if (score >= 50) {
            return "Стабильный уровень";
        }
        return "Есть зоны роста";
    }

    private static double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
