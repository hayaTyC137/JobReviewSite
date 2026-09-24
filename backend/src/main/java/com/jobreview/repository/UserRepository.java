package com.jobreview.repository;

import com.jobreview.model.Role;
import com.jobreview.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    /** Подтверждённый представитель компании — показываем его на странице организации */
    Optional<User> findFirstByCompanyIdAndRoleAndRepresentativeVerifiedTrue(Long companyId, Role role);
}
