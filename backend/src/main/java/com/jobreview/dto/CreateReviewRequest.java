package com.jobreview.dto;

import com.jobreview.model.EmploymentStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Новый отзыв о компании")
public record CreateReviewRequest(
        @NotNull @Schema(example = "FORMER") EmploymentStatus employmentStatus,
        @NotBlank @Size(max = 160) @Schema(example = "Frontend Engineer") String position,
        @Min(1) @Max(5) @Schema(example = "4") int overall,
        @NotNull @Valid RatingScoresDto scores,
        @NotBlank @Size(min = 30, max = 4000)
        @Schema(example = "Сильная команда и понятные цели, но процесс согласований между отделами затянут.")
        String text
) {
}
