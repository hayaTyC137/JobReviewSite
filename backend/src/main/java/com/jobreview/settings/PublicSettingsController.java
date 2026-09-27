package com.jobreview.settings;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Настройки", description = "Публичные настройки платформы")
public class PublicSettingsController {

    private final SettingsService settingsService;

    public PublicSettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping("/api/settings/public")
    @Operation(summary = "Публичные настройки", description = "Email поддержки, объявление в шапке, открыта ли регистрация.")
    public Map<String, String> publicSettings() {
        return settingsService.publicSettings();
    }
}
