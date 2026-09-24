package com.jobreview.exception;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Единый формат ошибки для фронтенда: статус, понятное сообщение и ошибки по полям формы.
 */
@Schema(description = "Описание ошибки")
public record ApiError(
        int status,
        @Schema(example = "Компания не найдена") String message,
        @Schema(description = "Ошибки валидации по полям, если есть") Map<String, String> fieldErrors,
        LocalDateTime timestamp
) {

    public static ApiError of(int status, String message) {
        return new ApiError(status, message, Map.of(), LocalDateTime.now());
    }
}
