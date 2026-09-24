package com.jobreview.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

/**
 * Сводный рейтинг компании — средние значения по всем видимым отзывам.
 * Если отзывов нет, средние равны null: честно показываем «нет данных», а не ноль.
 */
@Embeddable
@Getter
@Setter
public class CompanyRating {

    @Column(name = "avg_overall")
    private Double overall;

    @Column(name = "avg_climate")
    private Double climate;

    @Column(name = "avg_management")
    private Double management;

    @Column(name = "avg_team")
    private Double team;

    @Column(name = "avg_office")
    private Double office;

    @Column(name = "avg_clients")
    private Double clients;

    @Column(name = "avg_growth")
    private Double growth;

    @Column(name = "reviews_count", nullable = false)
    private int reviewsCount;
}
