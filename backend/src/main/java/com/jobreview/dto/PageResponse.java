package com.jobreview.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import org.springframework.data.domain.Page;

/**
 * Упрощённая обёртка над страницей Spring Data — во фронтенд уходят только нужные поля.
 */
@Schema(description = "Страница результатов")
public record PageResponse<T>(
        List<T> items,
        @Schema(description = "Номер страницы с нуля") int page,
        int size,
        long totalItems,
        int totalPages
) {

    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
