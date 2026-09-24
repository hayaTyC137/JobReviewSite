package com.jobreview.model;

/**
 * Жизненный цикл отзыва.
 * PUBLISHED — виден всем и учитывается в рейтинге.
 * UNDER_APPEAL — представитель компании подал жалобу, отзыв пока виден с пометкой.
 * HIDDEN — модератор удовлетворил жалобу, отзыв скрыт и не влияет на рейтинг.
 */
public enum ReviewStatus {
    PUBLISHED,
    UNDER_APPEAL,
    HIDDEN
}
