package com.jobreview.service;

import com.jobreview.dto.AuthResponse;
import com.jobreview.dto.LoginRequest;
import com.jobreview.dto.RegisterRequest;
import com.jobreview.dto.UserDto;
import com.jobreview.exception.BusinessRuleException;
import com.jobreview.exception.NotFoundException;
import com.jobreview.model.AuthProvider;
import com.jobreview.model.Role;
import com.jobreview.model.User;
import com.jobreview.repository.UserRepository;
import com.jobreview.security.JwtService;
import com.jobreview.security.UserPrincipal;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Регистрация, вход по паролю и вход через Google.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new BusinessRuleException("Пользователь с таким email уже зарегистрирован");
        }

        User user = new User();
        user.setEmail(request.email().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.displayName().trim());
        user.setJobTitle(request.jobTitle());
        user.setCity(request.city());
        user.setRole(Role.USER);
        user.setAuthProvider(AuthProvider.LOCAL);
        userRepository.save(user);

        return new AuthResponse(jwtService.generateToken(user), UserDto.from(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        // AuthenticationManager сам сверит пароль с BCrypt-хэшем и бросит BadCredentialsException
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        User user = getUser(principal.getId());
        return new AuthResponse(jwtService.generateToken(user), UserDto.from(user));
    }

    @Transactional(readOnly = true)
    public UserDto me(Long userId) {
        return UserDto.from(getUser(userId));
    }

    /**
     * Пользователь пришёл через Google. Если такой email уже есть — просто входим,
     * иначе создаём новую учётную запись без пароля.
     */
    @Transactional
    public User findOrCreateGoogleUser(String email, String fullName) {
        return userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
            User user = new User();
            user.setEmail(email.toLowerCase());
            user.setDisplayName(fullName != null && !fullName.isBlank() ? shortenName(fullName) : email);
            user.setRole(Role.USER);
            user.setAuthProvider(AuthProvider.GOOGLE);
            return userRepository.save(user);
        });
    }

    private User getUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new NotFoundException("Пользователь не найден"));
    }

    /** «Анна Коваленко» → «Анна К.» — на сайте авторы по умолчанию не светят полную фамилию */
    private String shortenName(String fullName) {
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length < 2) {
            return parts[0];
        }
        return parts[0] + " " + parts[1].charAt(0) + ".";
    }
}
