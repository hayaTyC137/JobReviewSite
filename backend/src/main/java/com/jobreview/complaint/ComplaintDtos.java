package com.jobreview.complaint;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public final class ComplaintDtos {

    private ComplaintDtos() {
    }

    @Schema(description = "Новая жалоба")
    public record CreateComplaint(
            @NotNull @Schema(example = "REVIEW") Complaint.TargetType targetType,
            @NotNull @Schema(example = "12") Long targetId,
            @NotNull @Schema(example = "FALSE_INFORMATION") Complaint.Reason reason,
            @NotBlank @Size(min = 20, max = 2000)
            @Schema(example = "Автор описывает события в отделе, которого в компании никогда не было.") String details
    ) {
    }

    @Schema(description = "Жалоба с кратким описанием того, на что жалуются")
    public record ComplaintView(
            Long id,
            Complaint.TargetType targetType,
            Long targetId,
            @Schema(description = "Что именно обжалуется: фрагмент отзыва, имя пользователя и т.п.") String targetPreview,
            @Schema(description = "Ссылка на объект на сайте, если он публичный") String targetLink,
            Complaint.Reason reason,
            String reasonLabel,
            String details,
            Complaint.Status status,
            String resolution,
            Long authorId,
            String authorName,
            LocalDateTime createdAt,
            LocalDateTime resolvedAt
    ) {
    }
}
