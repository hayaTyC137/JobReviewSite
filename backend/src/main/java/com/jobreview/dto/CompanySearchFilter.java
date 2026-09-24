package com.jobreview.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Параметры поиска компаний. Spring собирает запись прямо из query-параметров,
 * все поля необязательные — пустой фильтр возвращает весь каталог.
 */
public record CompanySearchFilter(
        @Schema(description = "Часть названия или юридического наименования", example = "nova") String q,
        @Schema(description = "Страна (точное совпадение)", example = "Россия") String country,
        @Schema(description = "Город (точное совпадение)", example = "Москва") String city,
        @DecimalMin("0") @DecimalMax("5") @Schema(description = "Минимальная общая оценка", example = "4") Double minRating,
        @DecimalMin("0") @DecimalMax("5") @Schema(description = "Минимум: психологический климат") Double minClimate,
        @DecimalMin("0") @DecimalMax("5") @Schema(description = "Минимум: руководство") Double minManagement,
        @DecimalMin("0") @DecimalMax("5") @Schema(description = "Минимум: коллектив") Double minTeam,
        @DecimalMin("0") @DecimalMax("5") @Schema(description = "Минимум: условия и офис") Double minOffice,
        @DecimalMin("0") @DecimalMax("5") @Schema(description = "Минимум: работа с клиентами") Double minClients,
        @DecimalMin("0") @DecimalMax("5") @Schema(description = "Минимум: карьерный рост") Double minGrowth,
        @Schema(description = "Сортировка", defaultValue = "RATING_DESC") CompanySort sort,
        @Min(0) @Schema(description = "Номер страницы с нуля", defaultValue = "0") Integer page,
        @Min(1) @Max(50) @Schema(description = "Размер страницы", defaultValue = "10") Integer size
) {

    public enum CompanySort {
        /** Сначала лучшие */
        RATING_DESC,
        /** Сначала худшие */
        RATING_ASC,
        /** Больше всего отзывов */
        REVIEWS_DESC,
        /** По алфавиту */
        NAME_ASC
    }

    public CompanySort sortOrDefault() {
        return sort == null ? CompanySort.RATING_DESC : sort;
    }

    public int pageOrDefault() {
        return page == null ? 0 : page;
    }

    public int sizeOrDefault() {
        return size == null ? 10 : size;
    }
}
