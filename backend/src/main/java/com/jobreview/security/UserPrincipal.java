package com.jobreview.security;

import com.jobreview.user.Role;
import com.jobreview.user.User;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Пользователь в контексте Spring Security. Храним только id, email, роль и признак блокировки —
 * этого хватает для проверки прав, а полную сущность сервисы при необходимости читают из БД.
 */
public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String email;
    private final String passwordHash;
    private final Role role;
    private final boolean blocked;

    public UserPrincipal(Long id, String email, String passwordHash, Role role, boolean blocked) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.blocked = blocked;
    }

    public static UserPrincipal from(User user) {
        return new UserPrincipal(user.getId(), user.getEmail(), user.getPasswordHash(), user.getRole(), user.isBlocked());
    }

    public Long getId() {
        return id;
    }

    public Role getRole() {
        return role;
    }

    public boolean isStaff() {
        return role.isStaff();
    }

    /** Spring ожидает роли с префиксом ROLE_, чтобы работали hasRole(...) */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    /** DaoAuthenticationProvider проверяет это до сверки пароля и бросает LockedException */
    @Override
    public boolean isAccountNonLocked() {
        return !blocked;
    }
}
