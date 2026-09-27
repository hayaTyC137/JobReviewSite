package com.jobreview.seed;

import com.jobreview.user.AuthProvider;
import com.jobreview.user.Role;
import com.jobreview.user.User;
import com.jobreview.user.UserRepository;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Первый администратор для «чистой» production-установки без демо-данных.
 * Срабатывает, только если заданы ADMIN_EMAIL и ADMIN_PASSWORD и в базе ещё нет ни одного ADMIN.
 * Если пользователь с таким email уже есть, он повышается до администратора (пароль не меняется).
 */
@Component
@Order(100)
public class AdminBootstrap implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
    private static final int MIN_PASSWORD_LENGTH = 12;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;

    public AdminBootstrap(UserRepository userRepository, PasswordEncoder passwordEncoder,
                          @Value("${app.bootstrap-admin.email:}") String email,
                          @Value("${app.bootstrap-admin.password:}") String password) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (email.isBlank() || userRepository.existsByRole(Role.ADMIN)) {
            return;
        }
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmailIgnoreCase(normalized).orElse(null);
        if (user == null) {
            if (password.length() < MIN_PASSWORD_LENGTH) {
                log.warn("ADMIN_PASSWORD короче {} символов — администратор не создан", MIN_PASSWORD_LENGTH);
                return;
            }
            user = new User();
            user.setEmail(normalized);
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setDisplayName("Администратор");
            user.setAuthProvider(AuthProvider.LOCAL);
        }
        user.setRole(Role.ADMIN);
        user.setCompany(null);
        user.setRepresentativeVerified(false);
        userRepository.save(user);
        log.info("Создан администратор {}", normalized);
    }
}
