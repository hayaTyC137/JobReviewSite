package com.jobreview.employee;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class EmployeeScoreCalculatorTest {

    private final EmployeeScoreCalculator calculator = new EmployeeScoreCalculator();

    @Test
    void noEvaluationsMeansNoScoreRatherThanZero() {
        EmployeeScoreDto result = calculator.calculate(List.of(), 0);
        assertThat(result.score()).isNull();
        assertThat(result.metrics()).hasSize(6).allSatisfy(m -> assertThat(m.average()).isNull());
    }

    @Test
    void perfectEvaluationGivesHundredAndToxicityIsInverted() {
        EmployeeScoreDto result = calculator.calculate(List.of(new EvaluationScores(1, 5, 5, 5, 5, 5)), 0);
        assertThat(result.score()).isEqualTo(100);
        assertThat(result.level()).isEqualTo("Образцовый сотрудник");
        assertThat(result.metrics().get(0).key()).isEqualTo("toxicity");
        assertThat(result.metrics().get(0).inverted()).isTrue();

        // Максимальная токсичность при прочих пятёрках снижает рейтинг
        assertThat(calculator.calculate(List.of(new EvaluationScores(5, 5, 5, 5, 5, 5)), 0).score()).isEqualTo(83);
    }

    @Test
    void averagesAcrossEmployersAndAppliesCappedDisciplinePenalty() {
        List<EvaluationScores> evaluations = List.of(new EvaluationScores(1, 5, 5, 5, 5, 5), new EvaluationScores(3, 3, 3, 3, 3, 3));
        // (5 + 3) / 2 = 4 → 75 баллов
        assertThat(calculator.calculate(evaluations, 0).score()).isEqualTo(75);
        assertThat(calculator.calculate(evaluations, 2).score()).isEqualTo(65);
        // Штраф ограничен 25 баллами
        EmployeeScoreDto heavy = calculator.calculate(evaluations, 20);
        assertThat(heavy.disciplinePenalty()).isEqualTo(25);
        assertThat(heavy.score()).isEqualTo(50);
    }

    @Test
    void scoreNeverGoesBelowZero() {
        assertThat(calculator.calculate(List.of(new EvaluationScores(5, 1, 1, 1, 1, 1)), 10).score()).isZero();
    }
}
