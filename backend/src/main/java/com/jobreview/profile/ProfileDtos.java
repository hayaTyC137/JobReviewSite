package com.jobreview.profile;

import com.jobreview.common.web.ValidationPatterns;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public final class ProfileDtos {

    private ProfileDtos() {
    }

    /**
     * Некритичные поля — применяются сразу. null в поле означает «очистить».
     */
    @Schema(description = "Изменение некритичных данных профиля")
    public record UpdateProfile(
            @Size(max = 120) @Schema(example = "Senior Product Designer") String jobTitle,
            @Size(max = 80) @Schema(example = "Молдова") String country,
            @Size(max = 120) @Schema(example = "Кишинёв") String city,
            @Size(max = 600) @Schema(example = "Проектирую B2B-интерфейсы, 7 лет в продуктовых командах.") String bio,
            @Pattern(regexp = ValidationPatterns.UPLOADED_IMAGE, message = "Загрузите изображение через /api/files")
            @Schema(example = "/api/files/1b4e28ba-2fa1-11d2-883f-0016d3cca427.png") String avatarUrl
    ) {
    }

    @Schema(description = "Заявка на смену критичных данных")
    public record CreateChangeRequest(
            @NotNull ProfileChangeRequest.Field field,
            @NotBlank @Size(max = 160) @Schema(example = "Анна Коваленко") String newValue,
            @Size(max = 500) @Schema(example = "Сменила фамилию после замужества") String reason
    ) {
    }

    @Schema(description = "Заявка на смену данных профиля")
    public record ChangeRequestView(
            Long id,
            Long userId,
            String userName,
            String userEmail,
            ProfileChangeRequest.Field field,
            String fieldLabel,
            String oldValue,
            String newValue,
            String reason,
            ProfileChangeRequest.Status status,
            String moderatorComment,
            LocalDateTime createdAt,
            LocalDateTime resolvedAt
    ) {

        static ChangeRequestView from(ProfileChangeRequest r) {
            return new ChangeRequestView(r.getId(), r.getUser().getId(), r.getUser().getDisplayName(),
                    r.getUser().getEmail(), r.getField(), r.getField().label(), r.getOldValue(), r.getNewValue(),
                    r.getReason(), r.getStatus(), r.getModeratorComment(), r.getCreatedAt(), r.getResolvedAt());
        }
    }
}
