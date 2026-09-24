package com.jobreview.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Заявка представителя компании на обжалование отзыва")
public record CreateAppealRequest(
        @NotBlank @Size(min = 20, max = 2000)
        @Schema(example = "Автор не работал в компании в указанный период: в штате нет сотрудника на такой должности.")
        String reason
) {
}
