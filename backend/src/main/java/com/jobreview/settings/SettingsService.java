package com.jobreview.settings;

import com.jobreview.common.error.InvalidInputException;
import com.jobreview.common.error.NotFoundException;
import com.jobreview.user.User;
import com.jobreview.user.UserRepository;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Системные настройки: значение по умолчанию берётся из {@link SettingKey}, администратор может его переопределить.
 */
@Service
public class SettingsService {

    private final PlatformSettingRepository repository;
    private final UserRepository userRepository;

    public SettingsService(PlatformSettingRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public String get(SettingKey key) {
        return repository.findById(key.key()).map(PlatformSetting::getValue).orElse(key.defaultValue());
    }

    public int getInt(SettingKey key) {
        return Integer.parseInt(get(key));
    }

    public boolean getBoolean(SettingKey key) {
        return Boolean.parseBoolean(get(key));
    }

    @Transactional(readOnly = true)
    public List<SettingDto> list() {
        Map<String, PlatformSetting> stored = new LinkedHashMap<>();
        repository.findAll().forEach(s -> stored.put(s.getKey(), s));
        return Arrays.stream(SettingKey.values())
                .map(key -> {
                    PlatformSetting s = stored.get(key.key());
                    return new SettingDto(key.key(), s == null ? key.defaultValue() : s.getValue(), key.defaultValue(),
                            key.description(), s == null ? null : s.getUpdatedAt());
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, String> publicSettings() {
        Map<String, String> result = new LinkedHashMap<>();
        for (SettingKey key : SettingKey.values()) {
            if (key.exposedPublicly()) {
                result.put(key.key(), get(key));
            }
        }
        return result;
    }

    @Transactional
    public SettingDto update(String rawKey, String value, Long adminId) {
        SettingKey key = SettingKey.fromKey(rawKey).orElseThrow(() -> new NotFoundException("Такой настройки нет"));
        String normalized = value == null ? "" : value.trim();
        if (!key.isValid(normalized)) {
            throw new InvalidInputException("Недопустимое значение для «" + key.description() + "»");
        }
        User admin = userRepository.getReferenceById(adminId);
        PlatformSetting setting = repository.findById(key.key()).orElseGet(() -> {
            PlatformSetting created = new PlatformSetting();
            created.setKey(key.key());
            return created;
        });
        setting.setValue(normalized);
        setting.setUpdatedAt(LocalDateTime.now());
        setting.setUpdatedBy(admin);
        repository.save(setting);
        return new SettingDto(key.key(), normalized, key.defaultValue(), key.description(), setting.getUpdatedAt());
    }
}
