package com.jobreview.auth;

import com.jobreview.common.error.BusinessRuleException;
import com.jobreview.common.error.InvalidInputException;
import com.jobreview.common.error.NotFoundException;
import com.jobreview.security.JwtService;
import com.jobreview.security.UserPrincipal;
import com.jobreview.settings.SettingKey;
import com.jobreview.settings.SettingsService;
import com.jobreview.user.AuthProvider;
import com.jobreview.user.Role;
import com.jobreview.user.User;
import com.jobreview.user.UserDto;
import com.jobreview.user.UserRepository;
import java.time.LocalDateTime;
import java.util.Locale;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Регистрация, вход по паролю и дозаполнение профиля после входа через соцсеть.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final SettingsService settingsService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager, JwtService jwtService,
                       SettingsService settingsService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.settingsService = settingsService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (!settingsService.getBoolean(SettingKey.REGISTRATION_ENABLED)) {
            throw new BusinessRuleException("Регистрация новых пользователей временно закрыта");
        }
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new BusinessRuleException("Пользователь с таким email уже зарегистрирован");
        }

        User user = new User();
        user.setEmail(request.email().trim().toLowerCase(Locale.ROOT));
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.displayName().trim());
        user.setJobTitle(blankToNull(request.jobTitle()));
        user.setCity(blankToNull(request.city()));
        user.setRole(Role.USER);
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        return new AuthResponse(jwtService.generateToken(user), UserDto.from(user));
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        // AuthenticationManager сверит пароль с BCrypt-хэшем и бросит BadCredentialsException,
        // а для заблокированного пользователя — LockedException (см. UserPrincipal.isAccountNonLocked)
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        User user = getUser(principal.getId());
        user.setLastLoginAt(LocalDateTime.now());
        return new AuthResponse(jwtService.generateToken(user), UserDto.from(user));
    }

    @Transactional(readOnly = true)
    public UserDto me(Long userId) {
        return UserDto.from(getUser(userId));
    }

    /**
     * Первый вход через соцсеть: пользователь указывает публичное имя, город и соглашается с правилами.
     * Email здесь можно указать только если провайдер его не передал — дальше смена адреса идёт через модератора.
     */
    @Transactional
    public UserDto completeOnboarding(Long userId, OnboardingRequest request) {
        User user = getUser(userId);
        if (user.isProfileCompleted()) {
            throw new BusinessRuleException("Профиль уже заполнен — изменить данные можно в личном кабинете");
        }
        if (OAuthAccountService.hasPlaceholderEmail(user)) {
            if (request.email() == null || request.email().isBlank()) {
                throw new InvalidInputException("Укажите email: провайдер не передал подтверждённый адрес");
            }
            String email = request.email().trim().toLowerCase(Locale.ROOT);
            if (userRepository.existsByEmailIgnoreCase(email)) {
                throw new BusinessRuleException("Этот email уже используется другим аккаунтом");
            }
            user.setEmail(email);
        }
        user.setDisplayName(request.displayName().trim());
        user.setJobTitle(blankToNull(request.jobTitle()));
        user.setCountry(request.country().trim());
        user.setCity(request.city().trim());
        user.setProfileCompleted(true);
        return UserDto.from(user);
    }

    private User getUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new NotFoundException("Пользователь не найден"));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
