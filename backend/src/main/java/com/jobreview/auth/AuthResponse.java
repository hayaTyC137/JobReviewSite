package com.jobreview.auth;

import com.jobreview.user.UserDto;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "JWT и данные пользователя после входа")
public record AuthResponse(
        @Schema(description = "Передавать в заголовке Authorization: Bearer <token>") String token,
        UserDto user
) {
}
