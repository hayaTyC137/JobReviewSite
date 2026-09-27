package com.jobreview.files;

import com.jobreview.common.error.ApiError;
import com.jobreview.common.ratelimit.RateLimiter;
import com.jobreview.config.OpenApiConfig;
import com.jobreview.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Duration;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
@Tag(name = "Файлы", description = "Загрузка аватаров, логотипов и баннеров")
public class FileController {

    private final FileStorageService storage;
    private final RateLimiter rateLimiter;

    public FileController(FileStorageService storage, RateLimiter rateLimiter) {
        this.storage = storage;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
    @Operation(summary = "Загрузить изображение", description = "PNG, JPEG или WebP до 2 МБ. Возвращает адрес для полей avatarUrl, logoUrl, bannerUrl.")
    @ApiResponse(responseCode = "201", description = "Файл сохранён")
    @ApiResponse(responseCode = "400", description = "Неподдерживаемый формат", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public Map<String, String> upload(@RequestParam("file") MultipartFile file, @AuthenticationPrincipal UserPrincipal principal) {
        rateLimiter.check("upload:" + principal.getId(), 30, Duration.ofHours(1), "Слишком много загрузок. Попробуйте позже.");
        return Map.of("url", storage.store(file));
    }

    @GetMapping("/{name}")
    @Operation(summary = "Получить изображение")
    public ResponseEntity<Resource> download(@PathVariable String name) {
        FileStorageService.StoredFile file = storage.load(name);
        return ResponseEntity.ok()
                .contentType(file.mediaType())
                // Имя уникально и файл не меняется — можно кэшировать надолго
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic().immutable())
                .header("X-Content-Type-Options", "nosniff")
                .body(file.resource());
    }
}
