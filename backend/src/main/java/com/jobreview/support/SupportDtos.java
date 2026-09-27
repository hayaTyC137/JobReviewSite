package com.jobreview.support;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public final class SupportDtos {

    private SupportDtos() {
    }

    @Schema(description = "Новое обращение в поддержку")
    public record CreateTicket(
            @NotBlank @Size(max = 120) @Schema(example = "Мария") String name,
            @NotBlank @Email @Size(max = 160) @Schema(example = "maria@example.com") String email,
            @NotNull @Schema(example = "COMPANY") SupportTicket.Topic topic,
            @NotBlank @Size(min = 4, max = 200) @Schema(example = "Не могу добавить логотип компании") String subject,
            @NotBlank @Size(min = 20, max = 4000) String message,
            @Schema(description = "Ловушка для ботов: люди это поле не видят и не заполняют") String website
    ) {
    }

    @Schema(description = "Ответ поддержки и смена статуса")
    public record UpdateTicket(
            @NotNull SupportTicket.Status status,
            @Size(max = 4000) String response
    ) {
    }

    @Schema(description = "Обращение в поддержку")
    public record TicketView(
            Long id,
            String name,
            String email,
            SupportTicket.Topic topic,
            String topicLabel,
            String subject,
            String message,
            SupportTicket.Status status,
            String response,
            String handledByName,
            boolean fromRegisteredUser,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {

        static TicketView from(SupportTicket t) {
            return new TicketView(t.getId(), t.getName(), t.getEmail(), t.getTopic(), t.getTopic().label(),
                    t.getSubject(), t.getMessage(), t.getStatus(), t.getResponse(),
                    t.getHandledBy() == null ? null : t.getHandledBy().getDisplayName(), t.getUser() != null,
                    t.getCreatedAt(), t.getUpdatedAt());
        }
    }
}
