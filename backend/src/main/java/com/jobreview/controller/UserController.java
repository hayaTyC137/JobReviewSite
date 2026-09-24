package com.jobreview.controller;

import com.jobreview.dto.AuthorCardDto;
import com.jobreview.exception.ApiError;
import com.jobreview.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Авторы", description = "Публичные карточки авторов отзывов")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{userId}/card")
    @Operation(summary = "Карточка автора отзыва",
            description = "Краткая информация и открытый рейтинг кандидатской активности с расшифровкой. "
                    + "Личные данные (email) не раскрываются.")
    @ApiResponse(responseCode = "200", description = "Карточка автора")
    @ApiResponse(responseCode = "404", description = "Пользователь не найден", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public AuthorCardDto card(@PathVariable Long userId) {
        return userService.getAuthorCard(userId);
    }
}
